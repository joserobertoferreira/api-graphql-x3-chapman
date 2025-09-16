import { JournalEntryAnalyticalLine, JournalEntryLine, Prisma } from '@prisma/client';
import {
  AccountingJournalStatusToAccountingJournalStatusGQL,
  LedgerTypeToLedgerTypeGQL,
  SignByDefaultToSignByDefaultGQL,
} from '../../../common/utils/enums/convert-enum';
import {
  JournalEntryAnalyticalLineEntity,
  JournalEntryDimensionEntity,
} from '../entities/journal-entry-analytic.entity';
import { JournalEntryEntity } from '../entities/journal-entry.entity';

export const journalEntryInclude = Prisma.validator<Prisma.JournalEntryInclude>()({
  lines: {
    include: {
      analytics: true,
    },
  },
});

export type JournalEntryWithRelations = Prisma.JournalEntryGetPayload<{ include: typeof journalEntryInclude }>;

/**
 * Maps the journal entry lines analytics to a flat structure.
 */
function mapAnalyticLineToEntity(analyticalLine: JournalEntryAnalyticalLine): JournalEntryAnalyticalLineEntity {
  const dimensions: JournalEntryDimensionEntity[] = [];

  for (let i = 1; i <= 10; i++) {
    const dimensionType = analyticalLine[`dimensionType${i}` as keyof JournalEntryAnalyticalLine] as string | null;
    const dimension = analyticalLine[`dimension${i}` as keyof JournalEntryAnalyticalLine] as string | null;

    if (dimension && dimension.trim() !== '') {
      dimensions.push({
        dimensionType: dimensionType || '',
        dimension: dimension || '',
      });
    }
  }

  return {
    journalEntryType: analyticalLine.journalEntryType,
    journalEntryLine: analyticalLine.journalEntryNumber,
    lineNumber: analyticalLine.lineNumber,
    ledgerTypeNumber: LedgerTypeToLedgerTypeGQL[analyticalLine.ledgerTypeNumber],
    analyticalLineNumber: analyticalLine.analyticalLineNumber ?? undefined,
    site: analyticalLine.site ?? undefined,
    dimensions: dimensions.length > 0 ? dimensions : undefined,
    transactionAmount: analyticalLine.transactionAmount.toNumber() ?? undefined,
  };
}

/**
 * Maps the journal entry lines to a flat structure.
 */
function mapLineToEntity(line: JournalEntryLine & { analytics: JournalEntryAnalyticalLine[] }) {
  const debitOrCredit = line.sign > 0 ? 1 : 2;

  return {
    journalEntryType: line.journalEntryType,
    journalEntryLine: line.journalEntryNumber,
    lineNumber: line.lineNumber,
    ledgerTypeNumber: LedgerTypeToLedgerTypeGQL[line.ledgerTypeNumber],
    site: line.site ?? undefined,
    accountingDate: line.accountingDate ?? undefined,
    chartOfAccount: line.chartOfAccounts ?? undefined,
    controlAccount: line.controlAccount ?? undefined,
    account: line.account,
    businessPartner: line.businessPartner ?? undefined,
    debitOrCredit: SignByDefaultToSignByDefaultGQL[debitOrCredit],
    transactionCurrency: line.transactionCurrency,
    transactionAmount: line.transactionAmount.toNumber(),
    ledgerCurrency: line.ledgerCurrency,
    ledgerAmount: line.ledgerAmount.toNumber(),
    lineDescription: line.lineDescription ?? undefined,
    tax: line.tax1 ?? undefined,
    analyticalLines:
      line.analytics && line.analytics.length > 0 ? line.analytics.map(mapAnalyticLineToEntity) : undefined,
  };
}

/**
 * Maps the journal entry to a flat structure.
 */
export function mapJournalEntryToEntity(journalEntry: JournalEntryWithRelations): JournalEntryEntity {
  return {
    journalEntryType: journalEntry.journalEntryType,
    journalEntryNumber: journalEntry.journalEntryNumber,
    company: journalEntry.company,
    site: journalEntry.site,
    journal: journalEntry.journal,
    accountingDate: journalEntry.accountingDate ?? undefined,
    journalEntryStatus:
      AccountingJournalStatusToAccountingJournalStatusGQL[journalEntry.journalEntryStatus] ?? undefined,
    journalEntryTransaction: journalEntry.journalEntryTransaction,
    transactionCurrency: journalEntry.transactionCurrency,
    journalEntryLines: journalEntry.lines.map(mapLineToEntity),
  };
}
