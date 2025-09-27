import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { AccountService } from '../../../common/services/account.service';
import { CommonService } from '../../../common/services/common.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { JournalEntryCompanySiteInfo, JournalEntryContext } from '../../../common/types/journal-entry.types';
import { getYearAndMonth, YearMonth } from '../../../common/utils/date.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { DimensionTypeConfigService } from '../../dimension-types/dimension-type-config.service';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';
import {
  getCompanyAndDocumentType,
  getCurrencyRates,
  getLedgersAndAccountsInformation,
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

    // Check if the lines has only one debit or credit
    this.validateDebitCreditFields(lines);

    // Check if the journal entry is balanced
    await this.checkIfJournalEntryIsBalanced(lines);

    const accountingDate = input.accountingDate ?? new Date();

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

    // Determine the fiscal year and period based on the accounting date
    const fiscalYear = await this.commonService.getFiscalYear(
      company,
      LocalMenus.LedgerType.LEGAL,
      accountingDate.getFullYear(),
    );

    const yearMonth: YearMonth = getYearAndMonth(accountingDate);

    if (!fiscalYear || fiscalYear.ledgerTypeNumber === undefined || fiscalYear.code === undefined) {
      throw new BadRequestException('Fiscal year or its properties are missing.');
    }

    const period = await this.commonService.getPeriod(company, fiscalYear.ledgerTypeNumber, fiscalYear.code, yearMonth);

    const companyInfo: JournalEntryCompanySiteInfo = {
      companyCode: company,
      siteCode: input.site,
      isLegalCompany: companyModel.isLegalCompany === LocalMenus.NoYes.YES,
      companyLegislation: companyModel.legislation,
    };

    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();

    // Validate each journal entry line
    const lineContext = await validateLines(
      lines,
      companyInfo,
      fiscalYear.code,
      period,
      accounts,
      rates,
      dimensionTypesMap,
      this.commonService,
      this.businessPartnerService,
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
      journalEntryTransaction: 'STDCO',
      category: LocalMenus.AccountingJournalCategory.ACTUAL,
      status: LocalMenus.AccountingJournalStatus.TEMPORARY,
      source: LocalMenus.EntryOrigin.DIRECT_ENTRY,
      documentType: documentTypeIsValid,
      typeOfOpenItem: documentTypeIsValid.openItemType,
      fiscalYear: fiscalYear.code,
      period: period ?? 0,
      currencyRates: rates,
      dimensionTypes: dimensionTypes,
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
