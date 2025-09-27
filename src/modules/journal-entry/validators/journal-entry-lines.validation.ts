import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CommonService } from '../../../common/services/common.service';
import { DimensionTypeConfig } from '../../../common/types/dimension.types';
import {
  JournalEntryCompanySiteInfo,
  JournalEntryLedgerWithPlanAndAccounts,
  JournalEntryLineAmount,
  JournalEntryLineContext,
  JournalEntryRateCurrency,
} from '../../../common/types/journal-entry.types';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { buildDimensionEntity } from '../../dimensions/helpers/dimension.helper';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';

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
  prismaService: PrismaService,
): Promise<JournalEntryLineContext[] | null> {
  const { companyCode, companyLegislation } = companyInfo;

  // Validate business partners in the lines
  const businessPartners = await validateBusinessPartners(lines, businessPartnerService);

  // Validate tax codes in batch
  const taxCodes = await validateTaxCodes(lines, companyInfo.companyLegislation, commonService);

  // Filter exchange rates to include only those relevant to the ledgers in use
  const rates = exchangeRates.filter((rate) => rate.ledger && rate.ledger.trim() !== '');

  const contextLines: JournalEntryLineContext[] = [];

  // Build an array of promises for line validations
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    // Execute validations asynchronously for each ledger
    for (const [ledgerIndex, data] of ledgerMap.entries()) {
      const ledgerType = ledgerIndex + 1;

      // Check if the ledger exists
      if (!data.ledgerCode) {
        continue; // Skip if ledger data is not available
      }

      // Get account data for the line and check if the account exists in the plan code
      const account = data.accounts.find((acc) => acc.account === line.account);
      if (!account) {
        throw new BadRequestException(
          `Line #${index + 1}: Ledger [${data.ledgerCode}] Account code "${line.account}" is not valid for company "${companyCode}".`,
        );
      }

      const legislation = data.ledger?.legislation || companyLegislation;

      // Check if the business partner requirement is met
      if (account.collective === LocalMenus.NoYes.YES) {
        if (!line.businessPartner || line.businessPartner.trim() === '') {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Business Partner is required for account code "${line.account}".`,
          );
        }

        // Verify if the business partner exists
        if (!businessPartners.has(line.businessPartner)) {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Business Partner "${line.businessPartner}" don't exist.`,
          );
        }
      } else if (line.businessPartner && line.businessPartner.trim() !== '') {
        line.businessPartner = ''; // Clear business partner if not required
      }

      // Check if is mandatory to inform tax management
      if (account.taxManagement > LocalMenus.TaxManagement.NOT_SUBJECTED) {
        if (!line.taxCode || line.taxCode.trim() === '') {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Tax is required for account code "${line.account}".`,
          );
        }

        // Check if the informed tax code is valid
        if (!taxCodes.has(line.taxCode)) {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Tax code "${line.taxCode}" doesn't exist or isn't valid for legislation "${legislation}".`,
          );
        }
      } else if (line.taxCode && line.taxCode.trim() !== '') {
        line.taxCode = ''; // Clear tax code if not required
      }

      // Get the dimension applicable for the account
      const dimensions = buildDimensionEntity(
        account,
        'dimensionType',
        account.numberOfDimensionsEntered || 0,
        'dimension',
      );

      const requiredDimensions = new Set(dimensions.map((d) => d.dimensionType));
      const providedDimensions = new Map<string, string>();

      if (line.dimensions) {
        for (const [field, type] of dimensionTypesMap.entries()) {
          if (line.dimensions[field]) {
            const value = line.dimensions[field];
            providedDimensions.set(field, value);
          }
        }
      }

      // Validate dimensions against account requirements
      for (const requiredType of requiredDimensions) {
        if (!providedDimensions.has(requiredType)) {
          throw new BadRequestException(
            `Line #${lineNumber}: Ledger [${data.ledgerCode}]: Missing required dimension type "${requiredType}" for account "${line.account}".`,
          );
        }
      }

      // Check for any invalid dimension types provided
      for (const providedType of providedDimensions.keys()) {
        if (!requiredDimensions.has(providedType)) {
          throw new BadRequestException(
            `Line #${lineNumber}: Ledger [${data.ledgerCode}]: Dimension type "${providedType}" is not applicable for account "${line.account}".`,
          );
        }
      }

      // Check if the account requires any dimension
      if (requiredDimensions.size > 0) {
        // If the account requires dimensions, ensure that the line has dimensions provided
        if (providedDimensions.size === 0) {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Account code "${line.account}" requires these ` +
              `dimensions to be provided: [${[...requiredDimensions].join(', ')}].`,
          );
        }

        const dimensionToValidate = Array.from(providedDimensions.entries()).map(([type, value]) => ({
          dimensionType: type,
          dimension: value,
        }));

        if (dimensionToValidate.length > 0) {
          // await validateDimensionValuesExist(prismaService, lineNumber, data.ledgerCode, dimensionToValidate);
        }
      }

      let accountingEntryValues: JournalEntryLineAmount = {
        debitOrCredit: 0,
        currency: '',
        currencyAmount: new Decimal(0),
        ledgerCurrency: '',
        ledgerAmount: new Decimal(0),
      };

      // Find the exchange rate for the current ledger
      const rate = rates.find((r) => r.ledger === data.ledgerCode);

      // If the entry is a debit
      if (line.debit) {
        accountingEntryValues.debitOrCredit = 1;
        accountingEntryValues.currency = rate?.sourceCurrency || '';
        accountingEntryValues.currencyAmount = new Decimal(line.debit);
        accountingEntryValues.ledgerCurrency = rate?.destinationCurrency || '';
        accountingEntryValues.ledgerAmount = accountingEntryValues.currencyAmount
          .mul(rate?.rate || 1)
          .div(rate?.divisor || 1)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }

      // If the entry is a credit
      if (line.credit) {
        accountingEntryValues.debitOrCredit = -1;
        accountingEntryValues.currency = rate?.sourceCurrency || '';
        accountingEntryValues.currencyAmount = new Decimal(line.credit);
        accountingEntryValues.ledgerCurrency = rate?.destinationCurrency || '';
        accountingEntryValues.ledgerAmount = accountingEntryValues.currencyAmount
          .mul(rate?.rate || 1)
          .div(rate?.divisor || 1)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }

      // If all validations pass, add the line to the context lines
      contextLines.push({
        ...line,
        lineNumber,
        ledgerType,
        ledger: data.ledgerCode,
        fiscalYear,
        period: period ?? 0,
        planCode: data.planCode,
        account: account.account,
        collective: account.mnemonic,
        dimensions: line.dimensions ? line.dimensions : {},
        amounts: accountingEntryValues,
      });

      // break; // Exit the ledger loop once a match is found
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
): Promise<Set<string>> {
  // Collect all business partner codes from the lines for batch validation
  const partnersToValidate = [...new Set(lines.map((line) => line.businessPartner).filter(Boolean))] as string[];

  if (partnersToValidate.length === 0) {
    return new Set<string>();
  }

  // If there are codes to validate, check their existence in the system
  const existingBPs = await businessPartnerService.findBusinessPartners({
    where: { code: { in: partnersToValidate }, select: { code: true } },
  });

  const businessPartners = new Set(existingBPs.map((bp) => bp.code));

  return businessPartners;
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
