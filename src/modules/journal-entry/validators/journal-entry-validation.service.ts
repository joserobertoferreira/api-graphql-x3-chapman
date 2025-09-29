import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { AccountService } from '../../../common/services/account.service';
import { CommonService } from '../../../common/services/common.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { JournalEntryCompanySiteInfo, JournalEntryContext } from '../../../common/types/journal-entry.types';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { DimensionTypeConfigService } from '../../dimension-types/dimension-type-config.service';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';
import {
  getCompanyAndDocumentType,
  getCurrencyRates,
  getLedgersAndAccountsInformation,
  validateAccountingDate,
} from '../helpers/journal-entry-validation.helpers';
import { validateLines } from './journal-entry-lines.validation';

@Injectable()
export class JournalEntryValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
    private readonly currencyService: CurrencyService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
  ) {}

  /**
   * Validate if the entire CreateJournalEntryInput object is valid.
   * @param input - The CreateJournalEntryInput to be validated.
   * @returns A valid context object
   * @throws HttpException if validation fails.
   */
  async validate(input: CreateJournalEntryInput): Promise<JournalEntryContext> {
    const { company, documentType, lines } = input;

    if (!lines || lines.length < 2) {
      throw new BadRequestException('At least two journal entry lines are required.');
    }

    // Get the entry transaction data
    const entryTransaction = await this.prisma.entryTransaction.findUnique({ where: { code: 'STDCO' } });
    if (!entryTransaction) {
      throw new BadRequestException('Standard Column Transaction type not found.');
    }

    // Check if the lines has only one debit or credit
    this.validateDebitCreditFields(lines);

    // Check if the journal entry is balanced
    await this.checkIfJournalEntryIsBalanced(lines);

    // Get the accounting model from company and validate document type
    const { companyModel, documentTypeIsValid } = await getCompanyAndDocumentType(
      company,
      documentType,
      this.prisma,
      this.accountService,
    );

    // Fetch the ledgers associated with the accounting model and collect account details
    const { ledgers, accounts } = await getLedgersAndAccountsInformation(
      companyModel.accountingModel,
      lines.map((line) => line.account),
      this.accountService,
    );

    // Various date validity checks (Transaction, document type, account, distribution and sections)
    const { accountingDate, fiscalYear, period } = await validateAccountingDate(
      input.accountingDate ?? new Date(),
      company,
      entryTransaction,
      documentTypeIsValid,
      this.commonService,
      this.parametersService,
    );

    // Check if source document date is valid when provided
    if (input.sourceDocumentDate) {
      const sourceDocumentDate = new Date(input.sourceDocumentDate);
      if (isNaN(sourceDocumentDate.getTime())) {
        throw new BadRequestException('Invalid source document date format.');
      }
      if (sourceDocumentDate > accountingDate) {
        throw new BadRequestException('Source document date cannot be later than the accounting date.');
      }
    }

    const companyInfo: JournalEntryCompanySiteInfo = {
      companyCode: company,
      siteCode: input.site,
      isLegalCompany: companyModel.isLegalCompany === LocalMenus.NoYes.YES,
      companyLegislation: companyModel.legislation,
    };

    // Get the currency rates used in the journal entry and determine the rate info based on the document type settings
    const { rates, accountingModelData } = await getCurrencyRates(
      input,
      documentTypeIsValid,
      companyModel.accountingModel,
      accountingDate,
      this.parametersService,
      this.accountService,
      this.currencyService,
    );

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
    const lineContext = await validateLines(
      lines,
      companyInfo,
      fiscalYear,
      period,
      accounts,
      rates,
      dimensionTypesMap,
      this.commonService,
      this.businessPartnerService,
      this.dimensionStrategyFactory,
      this.prisma,
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
      ...input,
      ledgers: ledgers,
      accountingDate: accountingDate,
      accountingModel: accountingModelData,
      legislation: companyModel.legislation,
      journalEntryTransaction: entryTransaction.code,
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
   * @throws BadRequestException if the journal entry is not balanced.
   */
  private async checkIfJournalEntryIsBalanced(lines: JournalEntryLineInput[]): Promise<void> {
    const totalDebit = lines.reduce((sum, line) => sum.add(line.debit ?? 0), new Prisma.Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.add(line.credit ?? 0), new Prisma.Decimal(0));

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException('Journal entry is not balanced.');
    }
  }

  /**
   * Validate that each journal entry line has either a debit or a credit field, but not both.
   * @param lines - The journal entry lines to be validated.
   * @throws BadRequestException if any line has both or neither fields.
   */
  private validateDebitCreditFields(lines: JournalEntryLineInput[]): void {
    for (const [index, line] of lines.entries()) {
      const hasDebit = line.debit !== undefined;
      const hasCredit = line.credit !== undefined;

      if (hasDebit && hasCredit) {
        throw new BadRequestException(`Line #${index + 1}: Cannot have both a debit and a credit field.`);
      }
      if (!hasDebit && !hasCredit) {
        throw new BadRequestException(`Line #${index + 1}: Must have either a debit or a credit field.`);
      }
    }
  }
}
