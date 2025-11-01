import { LocalMenus } from '@chapman/utils';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { AccountService } from '../../../common/services/account.service';
import { CommonJournalEntryService } from '../../../common/services/common-journal-entry.service';
import { AccountValidationPayload } from '../../../common/types/account.types';
import {
  GetCurrencyRates,
  IntercompanyJournalEntryContext,
  JournalEntryCompanySiteInfo,
  ValidationContext,
  ValidationLineFields,
} from '../../../common/types/journal-entry.types';
import { CompanyService } from '../../companies/company.service';
import { DimensionTypeConfigService } from '../../dimension-types/dimension-type-config.service';
import { DimensionService } from '../../dimensions/dimension.service';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { IntercompanyJournalEntryLineInput } from '../dto/create-intercompany-journal-entry-line.input';
import { CreateIntercompanyJournalEntryInput } from '../dto/create-intercompany-journal-entry.input';
import { validateLines } from './intercompany-journal-entry-lines.validation';

@Injectable()
export class IntercompanyJournalEntryValidationService {
  constructor(
    private readonly parametersService: ParametersService,
    private readonly companyService: CompanyService,
    private readonly accountService: AccountService,
    private readonly dimensionService: DimensionService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
    private readonly commonJournalEntryService: CommonJournalEntryService,
  ) {}

  /**
   * Validate if the entire CreateIntercompanyJournalEntryInput object is valid.
   * @param input - The CreateIntercompanyJournalEntryInput to be validated.
   * @returns A valid context object
   * @throws HttpException if validation fails.
   */
  async validate(input: CreateIntercompanyJournalEntryInput): Promise<IntercompanyJournalEntryContext> {
    // Normalize lines input
    const normalizedInput = this._normalizeJournalEntry(input);

    const { documentType, lines } = normalizedInput;

    if (!lines || lines.length < 1) {
      throw new BadRequestException('At least one journal entry line is required.');
    }

    // Get company from site
    const site = await this.companyService.getSiteByCode(normalizedInput.site, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Site ${normalizedInput.site} or its associated company not found.`);
    }

    const company = site.company.company;

    // Check if the lines has only one debit or credit
    this.debitCreditValidationFields(lines);

    // Get the accounting model from company and validate document type
    const { companyModel, documentTypeIsValid } = await this.commonJournalEntryService.getCompanyAndDocumentType(
      company,
      documentType,
    );

    // Fetch the ledgers associated with the accounting model and collect account details
    const accountLookups: AccountValidationPayload[] = lines.map((line) => ({
      account: line.account,
      site: line.site,
    }));

    const { ledgers, accounts } = await this.commonJournalEntryService.getLedgersAndAccountsInformation(
      companyModel.accountingModel,
      accountLookups,
    );

    // Various date validity checks (Transaction, document type, account, distribution and sections)
    const { accountingDate, fiscalYear, period } = await this.commonJournalEntryService.validateAccountingDate(
      normalizedInput.accountingDate ?? new Date(),
      company,
      undefined,
      documentTypeIsValid,
    );

    // Get the currency rates used in the journal entry and determine the rate info based on the document type settings
    const companyInfo: JournalEntryCompanySiteInfo = {
      companyCode: company,
      siteCode: normalizedInput.site,
      isLegalCompany: companyModel.isLegalCompany === LocalMenus.NoYes.YES,
      companyLegislation: companyModel.legislation,
    };

    // Check if is allowed to get lines with zero amounts
    const setLinesToZeroAllowed = await this.parametersService.getParameterValue(
      companyInfo.companyLegislation,
      normalizedInput.site,
      companyInfo.companyCode,
      'SIVNULL',
    );

    // Check if the journal entry is balanced
    const nullableLinesAllowed = parseInt(setLinesToZeroAllowed?.value ?? '1', 10);
    this.checkIfJournalEntryIsBalanced(lines, nullableLinesAllowed === LocalMenus.NoYes.YES);

    // Prepare rate info for currency rates retrieval
    const rateInfo: GetCurrencyRates = {
      intercompany: true,
      documentType: documentTypeIsValid,
      accountingModel: companyModel.accountingModel,
      accountingDate: accountingDate,
      sourceCurrency: normalizedInput.currency,
      rateType: normalizedInput.rateType || undefined,
      rateDate: normalizedInput.rateDate || undefined,
    };

    const { rates, accountingModelData } = await this.commonJournalEntryService.getCurrencyRates(rateInfo);

    // Prepare dimension types map with mandatory flags based on company settings
    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();

    // Validate each journal entry line
    const validateContext: ValidationContext = {
      companyInfo,
      documentType,
      fiscalYear,
      period,
      ledgerMap: accounts,
      exchangeRates: rates,
      dimensionTypesMap,
      accountingDate,
      rateType: normalizedInput.rateType,
      rateDate: normalizedInput.rateDate,
      currency: normalizedInput.currency,
    };

    const lineContext = await validateLines(
      lines,
      validateContext,
      this.companyService,
      this.accountService,
      this.dimensionService,
      this.dimensionStrategyFactory,
      this.commonJournalEntryService,
    );

    // Create the context header
    const dimensionTypes: string[] | null = [];
    for (let i = 1; i <= 10; i++) {
      let dimension = companyModel[`dimensionType${i}`] as string | null;
      if (dimension) {
        dimensionTypes.push(dimension);
      }
    }

    const context: IntercompanyJournalEntryContext = {
      ...normalizedInput,
      company: company,
      ledgers: ledgers,
      accountingDate: accountingDate,
      accountingModel: accountingModelData,
      legislation: companyModel.legislation,
      category: LocalMenus.AccountingJournalCategory.ACTUAL,
      status: LocalMenus.AccountingJournalStatus.TEMPORARY,
      source: LocalMenus.EntryOrigin.DIRECT_ENTRY,
      documentType: documentTypeIsValid,
      typeOfOpenItem: documentTypeIsValid.openItemType,
      fiscalYear: fiscalYear,
      period: period ?? 0,
      currencyRates: rates,
      dimensionTypes: dimensionTypes,
      dimensionTypesMap: dimensionTypesMap,
      lines: lineContext || [],
    };

    return context;
  }

  /**
   * Check if the journal entry is balanced.
   * @param lines - The journal entry lines to be checked.
   * @param setLinesToZeroAllowed - Flag indicating if lines with zero amounts are allowed.
   * @throws BadRequestException if the journal entry is not balanced.
   */
  private checkIfJournalEntryIsBalanced(
    lines: IntercompanyJournalEntryLineInput[],
    setLinesToZeroAllowed: boolean,
  ): void {
    const totalDebit = lines.reduce((sum, line) => sum.add(line.debit ?? 0), new Prisma.Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.add(line.credit ?? 0), new Prisma.Decimal(0));

    if (!setLinesToZeroAllowed && totalDebit.equals(0) && totalCredit.equals(0)) {
      throw new BadRequestException('Zero lines not allowed.');
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException('Journal entry is not balanced.');
    }
  }

  /**
   * Validates a list of journal entry lines against a set of business rules:
   * 1. A line must have either a debit/credit value OR a quantity value, but not both.
   * 2. The provided value (debit, credit, or quantity) must be a positive number.
   * 3. The 'site' field is mandatory and ONLY allowed for intercompany entry lines.
   * @param lines - The journal entry lines to be validated.
   * @param intercompany - Flag indicating if the lines are for intercompany journal entries.
   * @throws BadRequestException if any line has an invalid configuration.
   */
  private debitCreditValidationFields(lines: IntercompanyJournalEntryLineInput[]): void {
    for (const [index, line] of lines.entries()) {
      const lineToValidate: ValidationLineFields = {
        id: index + 1,
        debit: line.debit,
        credit: line.credit,
        quantity: 'quantity' in line ? line.quantity : undefined,
        site: line.site,
      };

      this.commonJournalEntryService.validateDebitCreditFields(lineToValidate, true);
    }
  }

  /**
   * Normalize journal entry lines by ensuring debit, credit, and quantity fields are numbers or undefined.
   * @param lines - The journal entry lines to be normalized.
   * @returns The normalized journal entry lines.
   */
  private _normalizeJournalEntry(input: CreateIntercompanyJournalEntryInput): CreateIntercompanyJournalEntryInput {
    // Normalize header fields to uppercase
    const headerFields = {
      site: input.site?.toUpperCase(),
      documentType: input.documentType?.toUpperCase(),
      sourceCurrency: input.currency?.toUpperCase(),
    };

    // Normalize lines
    const lineFields = input.lines.map((line) => {
      // Define a type for the common fields
      interface CommonFields extends Partial<IntercompanyJournalEntryLineInput> {
        dimensions?: DimensionsInput;
      }

      // Common fields
      const commonFields: CommonFields = {
        businessPartner: line.businessPartner?.toUpperCase(),
        taxCode: line.taxCode?.toUpperCase(),
      };

      if (line.dimensions) {
        commonFields.dimensions = Object.entries(line.dimensions).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? value.toUpperCase() : value;
          return acc;
        }, {} as DimensionsInput);
      }

      commonFields.site = line.site?.toUpperCase();

      return { ...line, ...commonFields };
    });

    return { ...input, ...headerFields, lines: lineFields };
  }
}
