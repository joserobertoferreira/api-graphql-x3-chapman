import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { DimensionInput } from '../../../common/inputs/dimension.input';
import { CommonService } from '../../../common/services/common.service';
import {
  JournalEntryLedgerWithPlanAndAccounts,
  JournalEntryLineAmount,
  JournalEntryLineContext,
  JournalEntryRateCurrency,
} from '../../../common/types/journal-entry.types';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { DimensionEntity } from '../../dimensions/entities/dimension.entity';
import { buildDimensionEntity } from '../../dimensions/helpers/dimension.helper';
import { JournalEntryLineInput } from '../dto/journal-entry-line.input';

/**
 * Validate journal entry lines.
 * This function checks each line of a journal entry to ensure that:
 */
export async function validateLines(
  lines: JournalEntryLineInput[],
  company: string,
  legislation: string,
  fiscalYear: number,
  period: number | null,
  ledgerMap: JournalEntryLedgerWithPlanAndAccounts[],
  exchangeRates: JournalEntryRateCurrency[],
  commonService: CommonService,
  businessPartnerService: BusinessPartnerService,
  prismaService: PrismaService,
): Promise<JournalEntryLineContext[] | null> {
  // Collect all business partner codes from the lines for batch validation
  const partnersToValidate = [...new Set(lines.map((line) => line.businessPartner).filter(Boolean))] as string[];

  // If there are codes to validate, check their existence in the system
  let existingBPs: { code: string }[] = [];

  if (partnersToValidate.length > 0) {
    existingBPs = await businessPartnerService.findBusinessPartners({
      where: { code: { in: partnersToValidate }, select: { code: true } },
    });
  }

  const businessPartners = new Set(existingBPs.map((bp) => bp.code));

  // Collect all taxes codes from the lines for batch validation
  const taxesToValidate = [...new Set(lines.map((line) => line.taxCode).filter(Boolean))] as string[];

  // If there are tax codes to validate, check their existence in the system
  let existingTaxes: { code: string }[] = [];

  if (taxesToValidate.length > 0) {
    existingTaxes = await commonService.getTaxCodes({
      where: { legislation: { equals: legislation }, code: { in: taxesToValidate } },
      select: { code: true },
    });
  }

  const taxCodes = new Set(existingTaxes.map((tax) => tax.code));

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
          `Line #${index + 1}: Ledger [${data.ledgerCode}] Account code "${line.account}" is not valid for company "${company}".`,
        );
      }

      const legislation = data.ledger?.legislation || '';

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

      // Check if the account requires any dimension
      if (dimensions.length > 0) {
        // If the account requires dimensions, ensure that the line has dimensions provided
        if (!line.dimensions || line.dimensions.length === 0) {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Account code "${line.account}" requires these ` +
              `dimensions to be provided: ${dimensions.map((d) => d.dimensionType).join(', ')}.`,
          );
        }

        // await validateDimensions(prismaService, data.ledgerCode, lineNumber, dimensions, line.dimensions);
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
        dimensions: line.dimensions || [],
        amounts: accountingEntryValues,
      });

      // break; // Exit the ledger loop once a match is found
    }
  }
  return contextLines;
}

/**
 * Helper function to validate dimensions for a journal entry line.
 * @param prismaService - The Prisma service instance.
 * @param line - line number
 * @param ledgerCode - The ledger code for context in error messages.
 * @param accountDimensions - The dimensions required by the account.
 * @param dimensions - The dimensions provided in the journal entry line.
 * @throws BadRequestException if validation fails.
 */
async function validateDimensions(
  prismaService: PrismaService,
  ledgerCode: string,
  line: number,
  accountDimensions: DimensionEntity[] | [],
  dimensions: DimensionInput[] | undefined,
): Promise<void> {
  const requiredDimensionTypes = new Set(accountDimensions?.map((d) => d.dimensionType));
  const inputDimensionTypes = new Map(dimensions?.map((d) => [d.typeCode, d.value]) ?? []);

  // Check if all required dimensions match those provided in the line
  for (const typeCode of inputDimensionTypes.keys()) {
    if (!requiredDimensionTypes.has(typeCode)) {
      const validTypes = [...requiredDimensionTypes].join(', ');

      throw new BadRequestException(
        `Line #${line}: Invalid dimension type "${typeCode}". Allowed type for this context is: [${validTypes}].`,
      );
    }
  }

  // Check if any required dimension is missing in the input
  if (requiredDimensionTypes.size !== inputDimensionTypes.size) {
    const missingRequiredTypes = [...requiredDimensionTypes].filter((t) => !inputDimensionTypes.has(t));

    if (missingRequiredTypes.length > 0) {
      throw new BadRequestException(
        `Line #${line}: Missing required dimensions. The following dimension types are required: [${missingRequiredTypes.join(', ')}].`,
      );
    }
  }

  // Check if each dimension value exists in the system
  const dimensionChecks =
    dimensions?.map((d) => ({
      dimensionType: d.typeCode,
      dimension: d.value,
    })) ?? [];

  if (dimensionChecks.length > 0) {
    const results = await prismaService.dimensions.findMany({
      where: { OR: dimensionChecks },
      select: { dimensionType: true, dimension: true },
    });

    const foundDimensions = new Set(results.map((r) => `${r.dimensionType}|${r.dimension}`));
    const notFoundDimensions = dimensionChecks.filter((d) => !foundDimensions.has(`${d.dimensionType}|${d.dimension}`));

    if (notFoundDimensions.length > 0) {
      const messages = notFoundDimensions.map((d) => ({
        field: 'dimensions',
        message: `Dimension value "${d.dimension}" does not exist for type "${d.dimensionType}".`,
        details: {
          typeCode: d.dimensionType,
          valueCode: d.dimension,
        },
      }));

      throw new BadRequestException({
        message: `Line #${line}: The following dimension values are invalid for ledger ${ledgerCode}.`,
        errors: messages,
      });
    }
  }
}
