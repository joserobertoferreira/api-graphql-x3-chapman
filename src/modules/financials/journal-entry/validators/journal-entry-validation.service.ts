import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestContextService } from 'src/common/context/request-context.service';
import { DimensionsInput } from 'src/common/inputs/dimension.input';
import { ParametersService } from 'src/common/parameters/parameter.service';
import { CommonJournalEntryService } from 'src/common/services/common-journal-entry.service';
import { AccountValidationPayload } from 'src/common/types/account.types';
import {
  GetCurrencyRates,
  JournalEntryCompanySiteInfo,
  JournalEntryContext,
  ValidationContext,
  ValidationLineFields,
} from 'src/common/types/journal-entry.types';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyService } from '../../../companies/company.service';
import { DimensionTypeConfigService } from '../../../dimension-types/dimension-type-config.service';
import { DimensionService } from '../../../dimensions/dimension.service';
import { DimensionStrategyFactory } from '../../../dimensions/strategies/dimension-strategy.factory';
import { UserService } from '../../../users/user.service';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';
import { validateLines } from './journal-entry-lines.validation';

@Injectable()
export class JournalEntryValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    private readonly companyService: CompanyService,
    private readonly dimensionService: DimensionService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
    private readonly commonJournalEntryService: CommonJournalEntryService,
    private readonly userService: UserService,
    private readonly requestContextService: RequestContextService,
  ) {}

  /**
   * Validate if the entire CreateJournalEntryInput object is valid.
   * @param input - The CreateJournalEntryInput to be validated.
   * @returns A valid context object
   * @throws HttpException if validation fails.
   */
  async validate(input: CreateJournalEntryInput): Promise<JournalEntryContext> {
    // Normalize lines input
    const normalizedInput = this._normalizeJournalEntry(input);

    const { documentType, lines } = normalizedInput;

    if (!lines || lines.length < 1) {
      throw new BadRequestException('At least one journal entry line is required.');
    }

    // Get the entry transaction data
    const entryTransaction = await this.prisma.entryTransaction.findUnique({ where: { code: 'STDCO' } });
    if (!entryTransaction) {
      throw new BadRequestException('Standard Column Transaction type not found.');
    }

    // Get company from site
    const site = await this.companyService.getSiteByCode(normalizedInput.site, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Site ${normalizedInput.site} or its associated company not found.`);
    }

    // If the reversing entry flag is provided, ensure the reversing date is also provided
    if (normalizedInput.isReversing && !normalizedInput.reversingDate) {
      throw new BadRequestException('Reversing date must be provided when reversing entry flag is set.');
    }
    if (!normalizedInput.isReversing && normalizedInput.reversingDate) {
      throw new BadRequestException('Reversing entry flag must be set when reversing date is provided.');
    }

    const company = site.company.company;

    // Check if the lines has only one debit or credit
    const hasQuantity = this.debitCreditValidationFields(lines);

    // Get the accounting model from company and validate document type
    const { companyModel, documentTypeIsValid } = await this.commonJournalEntryService.getCompanyAndDocumentType(
      company,
      documentType,
    );

    // Fetch the ledgers associated with the accounting model and collect account details
    const accountLookups: AccountValidationPayload[] = lines.map((line) => ({ account: line.account }));

    const { ledgers, accounts } = await this.commonJournalEntryService.getLedgersAndAccountsInformation(
      companyModel.accountingModel,
      accountLookups,
    );

    // Various date validity checks (Transaction, document type, account, distribution and sections)
    const { accountingDate, fiscalYear, period } = await this.commonJournalEntryService.validateAccountingDate(
      normalizedInput.accountingDate ?? new Date(),
      company,
      entryTransaction,
      documentTypeIsValid,
    );

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
    if (!hasQuantity) {
      const nullableLinesAllowed = parseInt(setLinesToZeroAllowed?.value ?? '1', 10);
      this.checkIfJournalEntryIsBalanced(lines, nullableLinesAllowed === LocalMenus.NoYes.YES);
    }

    // Check if source document date is valid when provided
    // this.isSourceDocumentDateValid(normalizedInput, accountingDate);

    const rateInfo: GetCurrencyRates = {
      intercompany: false,
      documentType: documentTypeIsValid,
      accountingModel: companyModel.accountingModel,
      accountingDate: accountingDate,
      sourceCurrency: normalizedInput.sourceCurrency,
      rateType: normalizedInput.rateType || undefined,
      rateDate: normalizedInput.rateDate || undefined,
      sourceDocumentDate: normalizedInput.sourceDocumentDate || undefined,
    };

    // Get the currency rates used in the journal entry and determine the rate info based on the document type settings
    const { rates, accountingModelData } = await this.commonJournalEntryService.getCurrencyRates(rateInfo);

    // Prepare dimension types map with mandatory flags based on company settings
    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();
    const companyMandatoryMap = new Map<string, boolean>();

    for (let i = 1; i <= 10; i++) {
      const typeCode = companyModel[`dimensionType${i}`] as string;
      if (typeCode) {
        const isMandatory = companyModel[`isMandatoryDimension${i}`] === 2;
        companyMandatoryMap.set(typeCode, isMandatory);
      }
    }

    // Iterate over the main map and update the 'isMandatory' flag.
    for (const config of dimensionTypesMap.values()) {
      config.isMandatory = companyMandatoryMap.get(config.code) || false;
    }

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
    };

    const lineContext = await validateLines(
      lines,
      validateContext,
      this.dimensionService,
      this.dimensionStrategyFactory,
      this.commonJournalEntryService,
      this.userService,
      this.requestContextService,
    );

    // Create the context header
    const dimensionTypes: string[] | null = [];
    for (let i = 1; i <= 10; i++) {
      let dimension = companyModel[`dimensionType${i}`] as string | null;
      if (dimension) {
        dimensionTypes.push(dimension);
      }
    }

    const context: JournalEntryContext = {
      ...normalizedInput,
      company: company,
      ledgers: ledgers,
      accountingDate: accountingDate,
      accountingModel: accountingModelData,
      journalEntryTransaction: entryTransaction?.code || '',
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
   * Check if the source document date is valid.
   * @param normalizedInput - The normalized journal entry input.
   * @param accountingDate - The accounting date to compare against.
   * @returns True if the source document date is valid.
   * @throws BadRequestException if the source document date is invalid.
   */
  private isSourceDocumentDateValid(normalizedInput: CreateJournalEntryInput, accountingDate: Date): boolean {
    if (normalizedInput.sourceDocumentDate) {
      const sourceDocumentDate = new Date(normalizedInput.sourceDocumentDate);
      if (isNaN(sourceDocumentDate.getTime())) {
        throw new BadRequestException('Invalid source document date format.');
      }
      if (sourceDocumentDate > accountingDate) {
        throw new BadRequestException('Source document date cannot be later than the accounting date.');
      }
    }
    return true;
  }

  /**
   * Check if the journal entry is balanced.
   * @param lines - The journal entry lines to be checked.
   * @param setLinesToZeroAllowed - Flag indicating if lines with zero amounts are allowed.
   * @throws BadRequestException if the journal entry is not balanced.
   */
  private checkIfJournalEntryIsBalanced(lines: JournalEntryLineInput[], setLinesToZeroAllowed: boolean): void {
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
   * @returns True if has quantity fields, false otherwise.
   * @throws BadRequestException if any line has an invalid configuration.
   */
  private debitCreditValidationFields(lines: JournalEntryLineInput[]): boolean {
    let hasQuantity = true;

    for (const [index, line] of lines.entries()) {
      const lineToValidate: ValidationLineFields = {
        id: index + 1,
        debit: line.debit,
        credit: line.credit,
        quantity: 'quantity' in line ? line.quantity : undefined,
        site: undefined,
      };

      const hasQuantityField = this.commonJournalEntryService.validateDebitCreditFields(lineToValidate, false);
      if (!hasQuantityField) {
        hasQuantity = false;
      }
    }

    return hasQuantity;
  }

  /**
   * Normalize journal entry lines by ensuring debit, credit, and quantity fields are numbers or undefined.
   * @param lines - The journal entry lines to be normalized.
   * @returns The normalized journal entry lines.
   */
  private _normalizeJournalEntry(input: CreateJournalEntryInput): CreateJournalEntryInput {
    // Normalize header fields to uppercase
    const headerFields = {
      site: input.site?.toUpperCase(),
      documentType: input.documentType?.toUpperCase(),
      sourceCurrency: input.sourceCurrency?.toUpperCase(),
      ...('sourceDocument' in input && { sourceDocument: input.sourceDocument?.toUpperCase() }),
    };

    // Normalize lines
    const lineFields = input.lines.map((line) => {
      // Define a type for the common fields
      interface CommonFields extends Partial<JournalEntryLineInput> {
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

      return { ...line, ...commonFields };
    });

    return { ...input, ...headerFields, lines: lineFields };
  }
}
