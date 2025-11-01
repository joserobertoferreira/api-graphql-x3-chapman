import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountService } from '../../../common/services/account.service';
import { CommonJournalEntryService } from '../../../common/services/common-journal-entry.service';
import { AccountValidationPayload } from '../../../common/types/account.types';
import { CompanyModel } from '../../../common/types/company.types';
import { DimensionTypeConfig } from '../../../common/types/dimension.types';
import {
  HeaderContext,
  IntercompanyJournalEntryLineContext,
  JournalEntryBusinessPartnerInfo,
  JournalEntryLedger,
  JournalEntryRateCurrency,
  ValidationContext,
} from '../../../common/types/journal-entry.types';
import {
  AccountingModel,
  Accounts,
  Dimensions,
  DocumentTypes,
  IntercompanyAccountMapping,
  Ledger,
} from '../../../generated/prisma';
import { CompanyService } from '../../companies/company.service';
import { DimensionService } from '../../dimensions/dimension.service';
import { buildDimensionEntity } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { IntercompanyJournalEntryLineInput } from '../dto/create-intercompany-journal-entry-line.input';
import { validateDimensionRules } from './intercompany-journal-entry-dimensions.validation';

interface EnrichedSiteData {
  siteCode: string;
  legalCompany: string;
  accountMapping: IntercompanyAccountMapping;
  companyModel: CompanyModel;
  documentType: DocumentTypes;
  accountLookups: AccountValidationPayload[];
  rates?: JournalEntryRateCurrency[];
  ledgers?: JournalEntryLedger[];
  accountingModelData?: AccountingModel;
}

interface SiteData {
  siteCode: string;
  legalCompany: string;
  accountMapping: {
    sourceCompany: string;
    sourceLedgerType: number;
    sourceMainChart: string;
    targetCompany: string;
    targetLedgerType: number;
    targetMainChart: string;
  };
  companyModel: CompanyModel;
  documentType: { sequenceNumber: string };
  account: { ledgerCode: string; ledger: Ledger; planCode: string; accounts: Accounts };
  rates: JournalEntryRateCurrency[];
}

/**
 * Validate journal entry lines.
 * This function checks each line of a journal entry to ensure that:
 */
export async function validateLines(
  lines: IntercompanyJournalEntryLineInput[],
  context: ValidationContext,
  companyService: CompanyService,
  accountService: AccountService,
  dimensionService: DimensionService,
  dimensionStrategyFactory: DimensionStrategyFactory,
  commonJournalEntryService: CommonJournalEntryService,
): Promise<IntercompanyJournalEntryLineContext[]> {
  const { companyInfo, fiscalYear, period, dimensionTypesMap } = context;
  const { companyCode, companyLegislation, siteCode } = companyInfo;

  // Validate sites and get their associated legal companies (for intercompany entries)
  const headerContext: HeaderContext = {
    company: companyCode,
    site: siteCode,
    accountingDate: context.accountingDate,
    currency: context.currency,
    rateDate: context.rateDate,
    rateType: context.rateType,
  };

  // Validate business partners in the lines
  const businessPartners = await businessPartnerValidation(lines, commonJournalEntryService);

  // Validate tax codes in batch
  const taxCodes = await taxCodesValidation(lines, companyLegislation, commonJournalEntryService);

  // Validate sites and get their associated legal companies (for intercompany entries)
  const siteCompanyMap = await sitesValidation(
    lines,
    headerContext,
    context.documentType,
    companyService,
    accountService,
    commonJournalEntryService,
  );

  // Filter exchange rates to include only those relevant to the ledgers in use
  const lineRates = siteCompanyMap.flatMap((siteData) => siteData.rates);
  const rates = lineRates.filter((rate) => rate.ledger && rate.ledger.trim() !== '');

  // Collect all dimensions provided in the lines for validation.
  const { dimensionsDataMap, dimensionNames } = await collectDimensions(lines, dimensionTypesMap, dimensionService);

  // Array to hold the validated line contexts
  const contextLines: IntercompanyJournalEntryLineContext[] = [];

  const validatedSites = new Map<string, SiteData>(siteCompanyMap.map((data) => [data.siteCode, data]));

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    // Get data for the line's site
    const siteData = validatedSites.get(line.site);
    if (!siteData) {
      throw new BadRequestException(`Internal logic error: Could not find validation data for site '${line.site}'.`);
    }

    const ledger = siteData.account.ledgerCode;
    const mnemonic = siteData.account.accounts.mnemonic;
    const unitOfWorkFlag = siteData.account.accounts.unitOfWorkFlag;
    const nonFinancialUnit = siteData.account.accounts.nonFinancialUnit;

    let planCode = '';
    let ledgerType = 0;

    if (siteData.legalCompany === siteData.accountMapping.sourceCompany) {
      planCode = siteData.accountMapping.sourceMainChart;
      ledgerType = siteData.accountMapping.sourceLedgerType;
    } else {
      planCode = siteData.accountMapping.targetMainChart;
      ledgerType = siteData.accountMapping.targetLedgerType;
    }

    // Check if account exists in the site ledger accounts
    const account = siteData.account.accounts.account;
    if (account !== line.account) {
      throw new BadRequestException(
        `Line #${index + 1}: Ledger [${ledger}] Account code ${line.account} is not valid for company ${siteData.legalCompany}.`,
      );
    }

    // Determine the legislation to use for tax code validation
    const legislation = siteData.companyModel.legislation || companyLegislation;

    // Validate the line against the account rules (business partner, tax, etc.)
    const validatedAccount = commonJournalEntryService.validateAccountRules(siteData.account.accounts, {
      lineNumber,
      ledgerCode: ledger,
      legislation,
      accountCode: account,
      businessPartner: line.businessPartner ?? '',
      businessPartners,
      taxCode: line.taxCode ?? '',
      taxCodes,
    });

    const updatedLine = {
      ...line,
      ...validatedAccount,
      site: siteData.siteCode,
      company: {
        companyCode: siteData.legalCompany,
        siteCode: siteData.siteCode,
        isLegalCompany: true,
        companyLegislation: legislation,
      },
    };

    // Get the dimension applicable for the account
    const dimensions = buildDimensionEntity(
      siteData.account.accounts,
      'dimensionType',
      siteData.account.accounts.numberOfDimensionsEntered || 0,
      'dimension',
    );

    // Validate dimensions for the line
    await validateDimensionRules(
      updatedLine,
      dimensions,
      dimensionNames,
      dimensionTypesMap,
      dimensionsDataMap,
      dimensionService,
      dimensionStrategyFactory,
      {
        lineNumber,
        ledgerCode: ledger,
      },
    );

    // Calculate amounts (debit/credit) in both transaction and ledger currencies
    const accountingEntryValues = commonJournalEntryService.calculateLineAmounts(
      updatedLine.debit || 0,
      updatedLine.credit || 0,
      ledger,
      rates,
    );

    // If all validations pass, add the line to the context lines
    contextLines.push({
      ...updatedLine,
      lineNumber,
      ledgerType,
      ledger: ledger,
      fiscalYear,
      period: period ?? 0,
      planCode: planCode,
      account: account,
      collective: mnemonic,
      dimensions: updatedLine.dimensions ? updatedLine.dimensions : {},
      amounts: accountingEntryValues,
      businessPartner: [...businessPartners.values()],
      unitOfWorkFlag: unitOfWorkFlag,
      nonFinancialUnit: nonFinancialUnit,
    });
  }

  return contextLines;
}

/**
 * Check if business partners in the lines exist in the system.
 * @param lines - Array of journal entry lines to validate.
 * @param commonJournalEntryService - Service for common journal entry operations.
 * @returns A map of valid business partner codes to their information.
 * @throws NotFoundException if any business partner does not exist.
 * @throws BadRequestException if any business partner is inactive.
 */
async function businessPartnerValidation(
  lines: IntercompanyJournalEntryLineInput[],
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
 * @param lines - The array of journal entry lines.
 * @param legislation - The company's legislation, required for the query.
 * @param commonJournalEntryService - Service for common journal entry operations.
 * @returns A Set containing the tax codes that exist for the legislation.
 */
async function taxCodesValidation(
  lines: IntercompanyJournalEntryLineInput[],
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
 * Validate that the sites in the lines exist and have associated companies.
 * @param lines - Array of intercompany journal entry lines to validate.
 * @param headerContext - The header context containing company, site, accounting date, rate date, and rate type.
 * @param headerDocumentType - The document type of the journal entry.
 * @param companyService - Service to fetch company and site data.
 * @param accountService - Service to fetch account data.
 * @param commonJournalEntryService - Service for common journal entry operations.
 * @returns A map of site codes to their associated company and legal company information.
 * @throws NotFoundException if any site does not exist or lacks an associated company.
 */
async function sitesValidation(
  lines: IntercompanyJournalEntryLineInput[],
  headerContext: HeaderContext,
  headerDocumentType: string,
  companyService: CompanyService,
  accountService: AccountService,
  commonJournalEntryService: CommonJournalEntryService,
): Promise<SiteData[]> {
  // Collect all sites from the lines for batch validation
  const sitesToValidate: string[] = [
    ...new Set(lines.map((line) => line.site).filter((site): site is string => Boolean(site))),
  ];

  if (sitesToValidate.length === 0) {
    // return new Map<string, JournalEntryCompanySiteInfo>();
  }

  const existingSites = await companyService.getSites({
    where: { siteCode: { in: sitesToValidate } },
    select: { siteCode: true, legalCompany: true, company: { select: { isLegalCompany: true, legislation: true } } },
  });

  // Check if all sites were found
  if (existingSites.length !== sitesToValidate.length) {
    const foundCodes = new Set(existingSites.map((site) => site.siteCode));
    const notFound = sitesToValidate.filter((code) => !foundCodes.has(code));

    throw new NotFoundException(`The following sites were not found: ${notFound.join(', ')}.`);
  }

  const siteCompanies = new Set(existingSites.map((site) => site.legalCompany).filter(Boolean) as string[]);

  // At least one line company (target) must be the same as the source company
  if (!siteCompanies.has(headerContext.company!)) {
    throw new BadRequestException(`At least one line company (target) must be the same as the source company.`);
  }

  // At least one line company (target) must be different than the source company
  if (siteCompanies.size === 1 && siteCompanies.has(headerContext.company!)) {
    throw new BadRequestException(`At least one line company (target) must be different than the source company.`);
  }

  // Get the accounting map for all companies involved
  const sitesMap = existingSites.reduce((map, site) => {
    const c = site.legalCompany;
    const s = site.siteCode;

    // If the company is not already in the map, initialize it with an empty array
    if (!map.has(c)) {
      map.set(c, []);
    }

    // Add the site code to the company's array
    map.get(c)!.push(s);

    // Return the updated map for the next iteration
    return map;
  }, new Map<string, string[]>());

  const mappingPromises: Promise<EnrichedSiteData>[] = existingSites.map(async (site) => {
    // Get intercompany account mapping between header company and line company
    const accountMapping = await commonJournalEntryService.getIntercompanyAccountMapping(
      headerContext.company!,
      site.legalCompany,
      headerContext.site!,
      site.siteCode,
      sitesMap,
    );

    // Get the accounting model from company and validate document type
    const { companyModel, documentTypeIsValid } = await commonJournalEntryService.getCompanyAndDocumentType(
      site.legalCompany,
      headerDocumentType,
    );

    // Filter lines for the current site
    const linesForSite = lines.filter((line) => line.site === site.siteCode);

    // Mount the lookup payload for accounts validation
    const lookupsForSite: AccountValidationPayload[] = linesForSite.map((line) => ({
      account: line.account,
      site: line.site,
    }));

    const result: EnrichedSiteData = {
      siteCode: site.siteCode,
      legalCompany: site.legalCompany,
      accountMapping,
      companyModel,
      documentType: documentTypeIsValid,
      accountLookups: lookupsForSite,
    };

    return result;
  });

  const mappingResults = await Promise.all(mappingPromises);

  const siteMapping: Promise<SiteData>[] = mappingResults.map(async (line) => {
    // Return if no have account for current line
    if (!line.accountLookups || line.accountLookups.length === 0) {
      return {
        siteCode: line.siteCode,
        legalCompany: '',
        accountMapping: {
          sourceCompany: '',
          sourceLedgerType: 1,
          sourceMainChart: '',
          targetCompany: '',
          targetLedgerType: 1,
          targetMainChart: '',
        },
        companyModel: {} as CompanyModel,
        documentType: { sequenceNumber: '' },
        account: { ledgerCode: '', ledger: {} as Ledger, planCode: '', accounts: {} as Accounts },
        rates: [],
      };
    }

    // Fetch the ledgers associated with the accounting model and collect account details
    const { ledgers, accounts } = await commonJournalEntryService.getLedgersAndAccountsInformation(
      line.companyModel.accountingModel,
      line.accountLookups,
    );

    // Prepare rate info for currency rates retrieval
    const accountingModelData = await accountService.getAccountingModel(line.companyModel.accountingModel);
    if (!accountingModelData) {
      throw new BadRequestException(`Accounting model data for ${line.companyModel.accountingModel} not found.`);
    }

    // Determine the rate info based on the document type settings
    const rates = await commonJournalEntryService.ledgerCurrencyRates(
      line.companyModel.accountingCurrency ?? 'GBP',
      accountingModelData,
      headerContext.currency!,
      headerContext.rateType!,
      headerContext.rateDate!,
    );

    return {
      siteCode: line.siteCode,
      legalCompany: line.legalCompany,
      accountMapping: {
        sourceCompany: line.accountMapping?.sourceCompany ?? '',
        sourceLedgerType: line.accountMapping?.sourceLedgerType ?? 1,
        sourceMainChart: line.accountMapping?.sourceMainChart ?? '',
        targetCompany: line.accountMapping?.targetCompany ?? '',
        targetLedgerType: line.accountMapping?.targetLedgerType ?? 1,
        targetMainChart: line.accountMapping?.targetMainChart ?? '',
      },
      companyModel: line.companyModel,
      documentType: { sequenceNumber: line.documentType.sequenceNumber },
      account: {
        ledgerCode: accounts[0].ledgerCode,
        ledger: accounts[0].ledger,
        planCode: accounts[0].planCode,
        accounts: accounts[0].accounts[0],
      },
      rates,
    };
  });

  const validationData = await Promise.all(siteMapping);

  return validationData;
}

/**
 * Collect all dimensions provided in the lines for validation.
 */
async function collectDimensions(
  lines: IntercompanyJournalEntryLineInput[],
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionService: DimensionService,
): Promise<{ dimensionsDataMap: Map<string, Dimensions>; dimensionNames: Map<string, string> }> {
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
  const dimensionsDataMap = await dimensionService.getDimensionsDataMap(pairsToValidate, dimensionTypesMap);

  return { dimensionsDataMap, dimensionNames };
}
