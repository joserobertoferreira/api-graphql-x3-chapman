import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Dimensions } from 'src/generated/prisma';
import { CommonService } from '../../../common/services/common.service';
import { DimensionTypeConfig } from '../../../common/types/dimension.types';
import {
  JournalEntryBusinessPartnerInfo,
  JournalEntryCompanySiteInfo,
  JournalEntryLedgerWithPlanAndAccounts,
  JournalEntryLineContext,
  JournalEntryRateCurrency,
} from '../../../common/types/journal-entry.types';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { buildDimensionEntity } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';
import { validateAccountRules } from './journal-entry-account.validation';
import { calculateJournalEntryLineAmounts } from './journal-entry-amount.validation';
import { validateDimensionRules } from './journal-entry-dimensions.validation';

/**
 * Validate journal entry lines.
 * This function checks each line of a journal entry to ensure that:
 */
export async function validateLines(
  lines: JournalEntryLineInput[],
  companyInfo: JournalEntryCompanySiteInfo,
  fiscalYear: number,
  period: number | null,
  ledgerMap: JournalEntryLedgerWithPlanAndAccounts[],
  exchangeRates: JournalEntryRateCurrency[],
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  commonService: CommonService,
  businessPartnerService: BusinessPartnerService,
  dimensionStrategyFactory: DimensionStrategyFactory,
  prismaService: PrismaService,
): Promise<JournalEntryLineContext[] | null> {
  const { companyCode, companyLegislation } = companyInfo;

  // Validate business partners in the lines
  const businessPartners = await validateBusinessPartners(lines, businessPartnerService, commonService);

  // Validate tax codes in batch
  const taxCodes = await validateTaxCodes(lines, companyInfo.companyLegislation, commonService);

  // Filter exchange rates to include only those relevant to the ledgers in use
  const rates = exchangeRates.filter((rate) => rate.ledger && rate.ledger.trim() !== '');

  // Collect all dimensions provided in the lines for validation.
  const allDimensions = new Map<string, { dimensionType: string; dimension: string }>();
  for (const line of lines) {
    if (line.dimensions) {
      for (const [field, config] of dimensionTypesMap.entries()) {
        if (line.dimensions[field]) {
          const value = line.dimensions[field];
          const type = config.code;
          const key = `${type}|${value}`;

          if (!allDimensions.has(key)) {
            allDimensions.set(key, { dimensionType: type, dimension: value });
          }
        }
      }
    }
  }

  const dimensionNames = new Map<string, string>();
  for (const [field, config] of dimensionTypesMap.entries()) {
    dimensionNames.set(config.code, field);
  }

  const pairsToValidate = Array.from(allDimensions.values());

  // Fetch existing dimensions from the database to validate their existence
  const existingDimensionsData =
    pairsToValidate.length > 0 ? await prismaService.dimensions.findMany({ where: { OR: pairsToValidate } }) : [];

  // Validate existence. Compare what was requested with what was found.
  if (existingDimensionsData.length < pairsToValidate.length) {
    const foundSet = new Set(existingDimensionsData.map((d) => `${d.dimensionType}|${d.dimension}`));
    const notFound = pairsToValidate.find((p) => !foundSet.has(`${p.dimensionType}|${p.dimension}`));

    // If 'notFound' is found (which will be the case), throw a clear error.
    if (notFound) {
      throw new NotFoundException(
        `Dimension value ${notFound.dimension} does not exist for type ${dimensionNames.get(notFound.dimensionType)}.`,
      );
    }
  }

  // Create a map with dimensions data for quick lookup during line validation
  const dimensionsDataMap = new Map<string, Dimensions>(
    existingDimensionsData.map((d) => [`${d.dimensionType}|${d.dimension}`, d]),
  );

  // Array to hold the validated line contexts
  const contextLines: JournalEntryLineContext[] = [];

  // Build an array of promises for line validations
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    // Execute validations asynchronously for each ledger
    for (const [ledgerIndex, data] of ledgerMap.entries()) {
      const ledgerType = ledgerIndex + 1;

      // Check if the ledger exists
      if (!data.ledgerCode) continue; // Skip if ledger data is not available

      // Get account data for the line and check if the account exists in the plan code
      const account = data.accounts.find((acc) => acc.account === line.account);
      if (!account) {
        throw new BadRequestException(
          `Line #${index + 1}: Ledger [${data.ledgerCode}] Account code ${line.account} is not valid for company ${companyCode}.`,
        );
      }

      // Determine the legislation to use for tax code validation
      const legislation = data.ledger?.legislation || companyLegislation;

      // Validate the line against the account rules (business partner, tax, etc.)
      const updatedLine = validateAccountRules(line, account, {
        lineNumber,
        ledgerCode: data.ledgerCode,
        legislation,
        businessPartners,
        taxCodes,
      });

      // Get the dimension applicable for the account
      const dimensions = buildDimensionEntity(
        account,
        'dimensionType',
        account.numberOfDimensionsEntered || 0,
        'dimension',
      );

      // Validate dimensions for the line
      await validateDimensionRules(
        updatedLine,
        dimensions,
        dimensionNames,
        dimensionTypesMap,
        dimensionsDataMap,
        dimensionStrategyFactory,
        {
          lineNumber,
          ledgerCode: data.ledgerCode,
        },
      );

      // Calculate amounts (debit/credit) in both transaction and ledger currencies
      const accountingEntryValues = calculateJournalEntryLineAmounts(updatedLine, data.ledgerCode, rates);

      // If all validations pass, add the line to the context lines
      contextLines.push({
        ...updatedLine,
        lineNumber,
        ledgerType,
        ledger: data.ledgerCode,
        fiscalYear,
        period: period ?? 0,
        planCode: data.planCode,
        account: account.account,
        collective: account.mnemonic,
        dimensions: updatedLine.dimensions ? updatedLine.dimensions : {},
        amounts: accountingEntryValues,
        businessPartner: [...businessPartners.values()],
      });
    }
  }
  return contextLines;
}

/**
 * Check if business partners in the lines exist in the system.
 * @param lines - Array of journal entry lines to validate.
 * @param businessPartnerService - Service to access business partner data.
 */
async function validateBusinessPartners(
  lines: JournalEntryLineInput[],
  businessPartnerService: BusinessPartnerService,
  commonService: CommonService,
): Promise<Map<string, JournalEntryBusinessPartnerInfo>> {
  // Collect all business partner codes from the lines for batch validation
  const partnersToValidate = [...new Set(lines.map((line) => line.businessPartner).filter(Boolean))] as string[];

  if (partnersToValidate.length === 0) {
    return new Map();
  }

  // If there are codes to validate, check their existence in the system
  const existingBPs = await businessPartnerService.findBusinessPartners({
    where: { code: { in: partnersToValidate } },
    select: {
      code: true,
      isCustomer: true,
      isSupplier: true,
      customer: {
        select: {
          isActive: true,
          payByCustomer: true,
          payByCustomerAddress: true,
          paymentTerm: true,
          accountingCode: true,
        },
      },
      supplier: {
        select: {
          isActive: true,
          payToBusinessPartner: true,
          payToBusinessPartnerAddress: true,
          paymentTerm: true,
          accountingCode: true,
        },
      },
    },
    // include: { customer: true, supplier: true },
  });

  // If any of the provided codes do not exist, throw an error
  if (existingBPs.length !== partnersToValidate.length) {
    const foundCodes = new Set(existingBPs.map((bp) => bp.code));
    const notFound = partnersToValidate.find((code) => !foundCodes.has(code));
    throw new NotFoundException(`Business partner ${notFound} not found.`);
  }

  // Validate if the business partners are active (not blocked)
  const inactiveBPs: string[] = [];
  for (const bp of existingBPs) {
    // Check in client data if is inactive
    if (bp.isCustomer === LocalMenus.NoYes.YES) {
      if (!bp.customer || bp.customer.isActive !== LocalMenus.NoYes.YES) {
        inactiveBPs.push(`${bp.code} (as Customer is inactive or missing)`);
        continue;
      }
    }

    // Check in supplier data if is inactive
    if (bp.isSupplier === LocalMenus.NoYes.YES) {
      if (!bp.supplier || bp.supplier.isActive !== LocalMenus.NoYes.YES) {
        inactiveBPs.push(`${bp.code} (as Supplier is inactive or missing)`);
        continue;
      }
    }
  }

  if (inactiveBPs.length > 0) {
    throw new BadRequestException(
      `The following business partner(s) are inactive or improperly configured: ${inactiveBPs.join(', ')}.`,
    );
  }

  const paymentTerms = [
    ...new Set(
      existingBPs
        .map((bp) => (bp.isCustomer === LocalMenus.NoYes.YES ? bp.customer?.paymentTerm : bp.supplier?.paymentTerm))
        .filter((pt): pt is string => !!pt),
    ),
  ];

  const paymentMethodsMap = await commonService.getPaymentMethodByTerms(paymentTerms);

  // Build the returned business partner info with payment methods
  const enrichedBPs = new Map<string, JournalEntryBusinessPartnerInfo>();

  for (const bp of existingBPs) {
    const paymentTerm = bp.isCustomer === LocalMenus.NoYes.YES ? bp.customer?.paymentTerm : bp.supplier?.paymentTerm;

    const paymentInfo = paymentTerm ? paymentMethodsMap.get(paymentTerm) || null : null;

    const partnerInfo: JournalEntryBusinessPartnerInfo = {
      ...bp,
      customer: bp.customer,
      supplier: bp.supplier,
      paymentMethod: paymentInfo?.paymentMethod || null,
      paymentType: paymentInfo?.paymentType || null,
    };

    enrichedBPs.set(bp.code, partnerInfo);
  }

  // Return a set of valid business partner codes for quick lookup
  return enrichedBPs;
}

/**
 * Validates the existence of all unique tax codes provided in the lines.
 * Makes a single service call to optimize performance.
 *
 * @param lines - The array of journal entry lines.
 * @param legislation - The company's legislation, required for the query.
 * @param commonService - The service instance to fetch tax data.
 * @returns A Set containing the tax codes that exist for the legislation.
 */
async function validateTaxCodes(
  lines: JournalEntryLineInput[],
  legislation: string,
  commonService: CommonService,
): Promise<Set<string>> {
  // Collect all taxes codes from the lines for batch validation
  const taxesToValidate = [...new Set(lines.map((line) => line.taxCode).filter(Boolean))] as string[];

  if (taxesToValidate.length === 0) {
    return new Set<string>();
  }

  // If there are tax codes to validate, check their existence in the system
  const existingTaxes = await commonService.getTaxCodes({
    where: { legislation: { equals: legislation }, code: { in: taxesToValidate } },
    select: { code: true },
  });

  const taxCodesSet = new Set(existingTaxes.map((tax) => tax.code));

  return taxCodesSet;
}
