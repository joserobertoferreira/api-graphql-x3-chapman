import { Injectable } from '@nestjs/common';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { CreateJournalEntryInput } from '../../modules/journal-entry/dto/journal-entry.input';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountService } from '../services/account.service';
import { CommonService } from '../services/common.service';
import { LocalMenus } from '../utils/enums/local-menu';

@ValidatorConstraint({ name: 'journalEntryValidator', async: true })
@Injectable()
export class JournalEntryValidator implements ValidatorConstraintInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
  ) {}

  /**
   * Valida o objeto CreateJournalEntryInput inteiro.
   * @param input - O objeto CreateJournalEntryInput a ser validado.
   * @param args - Argumentos da validação.
   */
  async validate(input: CreateJournalEntryInput, args: ValidationArguments): Promise<boolean> {
    const { company, sourceCurrency, rateType, lines } = input;

    if (!lines || lines.length === 0) {
      return true;
    }

    // Check if the currency exists
    const currency = await this.commonService.currencyExists(sourceCurrency);
    if (!currency) {
      (args.object as any)._validation_error_message = `Currency "${sourceCurrency}" does not exist.`;
      return false;
    }

    // Get the accounting model from company
    const accountingModel = await this.prisma.company.findUnique({
      where: { company: company },
      select: { accountingModel: true },
    });

    if (!accountingModel) {
      (args.object as any)._validation_error_message = `Accounting model for company "${company}" not found.`;
      return false;
    }

    // Fetch the ledgers associated with the accounting model
    const ledgers = await this.commonService.getLedgers(accountingModel.accountingModel);

    if (ledgers.length === 0) {
      (args.object as any)._validation_error_message =
        `No ledgers found for accounting model "${accountingModel.accountingModel}".`;
      return false;
    }

    // Get the chart of accounts associated with the main ledger
    const chart = await this.commonService.getChartCode(ledgers[0].LED_0);

    if (!chart) {
      (args.object as any)._validation_error_message = `Chart of accounts for ledger "${ledgers[0].LED_0}" not found.`;
      return false;
    }

    // Collect all account codes from the journal entry lines
    const accountCodes = lines.map((line) => line.account);

    // Fetch account details for all account codes in the journal entry lines
    const accounts = await this.accountService.getAccounts(chart, accountCodes);

    const accountMap = new Map(accounts.map((acc) => [acc.account, acc]));

    // Validate each line in the journal entry
    for (const [index, line] of lines.entries()) {
      const account = accountMap.get(line.account);

      // Check if the account exists in the chart of accounts
      if (!account) {
        (args.object as any)._validation_error_message =
          `Line #${index + 1}: Account code "${line.account}" is not valid for company "${company}".`;
        return false;
      }

      // Check if the business partner requirement is met
      if (
        account.collective === LocalMenus.NoYes.YES &&
        (!line.businessPartner || line.businessPartner.trim() === '')
      ) {
        (args.object as any)._validation_error_message =
          `Line #${index + 1}: Business Partner is required for account code "${line.account}".`;
        return false;
      }
    }

    return true;
  }
}
