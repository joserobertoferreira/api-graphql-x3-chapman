import { BadRequestException } from '@nestjs/common';
import { RequestContextService } from 'src/common/context/request-context.service';
import { CommonJournalEntryService } from 'src/common/services/common-journal-entry.service';
import {
  AccountValidationContextRules,
  AccountValidationLineInput,
  BaseLineValidationContext,
  LineContext,
} from 'src/common/types/account.types';
import { DimensionTypeConfig } from 'src/common/types/dimension.types';
import { JournalEntryBusinessPartnerInfo } from 'src/common/types/journal-entry.types';
import { Dimensions } from 'src/generated/prisma/client';
import { DimensionService } from '../../modules/dimensions/dimension.service';
import { buildDimensionEntity } from '../../modules/dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../modules/dimensions/strategies/dimension-strategy.factory';
import { validateDimensionRules } from '../../modules/financials/journal-entry/validators/journal-entry-dimensions.validation';
import { UserService } from '../../modules/users/user.service';

/**
 * Validate document lines (account, business partner, tax code, dimensions).
 * This function checks each line of a document (journal entry, supplier
 * invoice, etc.) to ensure that:
 */
export async function validateLines<TLine extends AccountValidationLineInput>(
  lines: TLine[],
  context: BaseLineValidationContext,
  dimensionService: DimensionService,
  dimensionStrategyFactory: DimensionStrategyFactory,
  commonJournalEntryService: CommonJournalEntryService,
  userService: UserService,
  requestContextService: RequestContextService,
): Promise<Array<LineContext<TLine>> | null> {
  const { companyInfo, fiscalYear, period, ledgerMap, exchangeRates, dimensionTypesMap, accountingDate, isExcel } =
    context;
  const { companyCode, companyLegislation, siteCode } = companyInfo;

  // Validate business partners in the lines
  const businessPartners = await businessPartnerValidation(lines, commonJournalEntryService);

  // Validate tax codes in batch
  const taxCodes = await taxCodesValidation(lines, companyLegislation, commonJournalEntryService);

  // Filter exchange rates to include only those relevant to the ledgers in use
  const rates = exchangeRates.filter((rate) => rate.ledger && rate.ledger.trim() !== '');

  // Collect all dimensions provided in the lines for validation.
  const { dimensionsDataMap, dimensionNames } = await collectDimensions(
    lines,
    dimensionTypesMap,
    dimensionService,
    isExcel || false,
  );

  // Array to hold the validated line contexts
  const contextLines: Array<LineContext<TLine>> = [];

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

      // Check if user was able to use the dimension based on access code
      let currentUser: string | undefined = undefined;
      if (isExcel) {
        currentUser = requestContextService.getCurrentUser();
      }
      // Validate the line against the account rules (business partner, tax, etc.)
      const validationContext: AccountValidationContextRules = {
        lineNumber,
        ledgerCode: data.ledgerCode,
        legislation,
        accountCode: line.account,
        businessPartner: line.businessPartner ?? '',
        businessPartners,
        taxCode: line.taxCode ?? '',
        taxCodes,
        isExcel: isExcel ?? false,
        currentUser,
        accountingDate,
        site: siteCode,
      };

      const validatedAccount = await commonJournalEntryService.validateAccountRules(
        account,
        validationContext,
        userService,
      );

      const updatedLine = { ...line, ...validatedAccount };

      // Get the dimension applicable for the account
      const dimensions = buildDimensionEntity(
        account,
        'dimensionType',
        account.numberOfDimensionsEntered || 0,
        'dimension',
      );

      // Validate dimensions for the line
      const newLine = await validateDimensionRules(
        updatedLine,
        dimensions,
        dimensionNames,
        dimensionTypesMap,
        dimensionsDataMap,
        dimensionService,
        dimensionStrategyFactory,
        {
          lineNumber,
          ledgerCode: data.ledgerCode,
          site: siteCode,
          accountingDate,
          isExcel: isExcel ?? false,
        },
      );

      // Calculate amounts in both transaction and ledger currencies. Documents with no
      // debit/credit distinction (e.g. supplier invoice) provide `amount` instead, always
      // treated as the single-sided (debit) value.
      const accountingEntryValues = commonJournalEntryService.calculateLineAmounts(
        newLine.amount ?? newLine.debit ?? 0,
        newLine.amount !== undefined ? 0 : newLine.credit || 0,
        data.ledgerCode,
        rates,
      );

      const specificBusinessPartner = newLine.businessPartner
        ? businessPartners.get(newLine.businessPartner)
        : undefined;

      // If all validations pass, add the line to the context lines
      contextLines.push({
        ...newLine,
        lineNumber,
        ledgerType,
        ledger: data.ledgerCode,
        fiscalYear,
        period: period ?? 0,
        planCode: data.planCode,
        account: account.account,
        collective: account.mnemonic,
        dimensions: newLine.dimensions ? newLine.dimensions : {},
        amounts: accountingEntryValues,
        businessPartner: specificBusinessPartner ? [specificBusinessPartner] : [],
        unitOfWorkFlag: account.unitOfWorkFlag,
        nonFinancialUnit: account.nonFinancialUnit,
      });
    }
  }

  return contextLines;
}

/**
 * Check if business partners in the lines exist in the system.
 * @param lines - Array of document lines to validate.
 * @param commonJournalEntryService - Service for common journal entry operations.
 * @returns A map of valid business partner codes to their information.
 * @throws NotFoundException if any business partner does not exist.
 * @throws BadRequestException if any business partner is inactive.
 */
async function businessPartnerValidation(
  lines: AccountValidationLineInput[],
  commonJournalEntryService: CommonJournalEntryService,
): Promise<Map<string, JournalEntryBusinessPartnerInfo>> {
  // Collect all business partner codes from the lines for batch validation
  const partnersToValidate: string[] = [
    ...new Set(lines.map((line) => line.businessPartner).filter((bp): bp is string => Boolean(bp))),
  ];

  const results = await commonJournalEntryService.validateBusinessPartners(partnersToValidate);

  // Return a set of valid business partner codes for quick lookup
  return results;
}

/**
 * Validates the existence of all unique tax codes provided in the lines.
 * Makes a single service call to optimize performance.
 *
 * @param lines - The array of document lines.
 * @param legislation - The company's legislation, required for the query.
 * @param commonJournalEntryService - Service for common journal entry operations.
 * @returns A Set containing the tax codes that exist for the legislation.
 */
async function taxCodesValidation(
  lines: AccountValidationLineInput[],
  legislation: string,
  commonJournalEntryService: CommonJournalEntryService,
): Promise<Set<string>> {
  // Collect all taxes codes from the lines for batch validation
  const taxesToValidate: string[] = [
    ...new Set(lines.map((line) => line.taxCode).filter((taxCode): taxCode is string => Boolean(taxCode))),
  ];

  const results = await commonJournalEntryService.validateTaxCodes(taxesToValidate, legislation);

  return results;
}

/**
 * Collect all dimensions provided in the lines for validation.
 */
async function collectDimensions(
  lines: AccountValidationLineInput[],
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionService: DimensionService,
  isExcel: boolean,
): Promise<{
  dimensionsDataMap: Map<string, Dimensions>;
  dimensionNames: Map<string, string>;
}> {
  const allDimensions = new Map<string, { dimensionType: string; dimension: string }>();

  for (const line of lines) {
    if (line.dimensions) {
      for (const [field, config] of dimensionTypesMap.entries()) {
        if (line.dimensions[field]) {
          const value = line.dimensions[field] as string;
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
  const dimensionsDataMap = await dimensionService.getDimensionsDataMap(pairsToValidate, dimensionTypesMap, isExcel);

  return { dimensionsDataMap, dimensionNames };
}
