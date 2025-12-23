import { CommonDimensionEntity } from 'src/common/outputs/common-dimension.entity';
import {
  AccountingJournalStatusToAccountingJournalStatusGQL,
  LedgerTypeToLedgerTypeGQL,
  SignByDefaultToSignByDefaultGQL,
} from 'src/common/utils/enums/convert-enum';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { JournalEntryAnalyticalLine, JournalEntryLine, Prisma } from 'src/generated/prisma/client';
import { JournalEntryAnalyticalLineEntity } from '../entities/journal-entry-analytic.entity';
import { JournalEntryEntity } from '../entities/journal-entry.entity';

export const journalEntryInclude = {
  lines: {
    include: {
      analytics: true,
    },
  },
} satisfies Prisma.JournalEntryInclude;

export type JournalEntryWithRelations = Prisma.JournalEntryGetPayload<{ include: typeof journalEntryInclude }>;

/**
 * Maps the journal entry lines analytics to a flat structure.
 */
function mapAnalyticLineToEntity(analyticalLine: JournalEntryAnalyticalLine): JournalEntryAnalyticalLineEntity {
  const dimensions: CommonDimensionEntity = {
    fixture: analyticalLine.dimension1,
    broker: analyticalLine.dimension2,
    department: analyticalLine.dimension3,
    location: analyticalLine.dimension4,
    type: analyticalLine.dimension5,
    product: analyticalLine.dimension6,
    analysis: analyticalLine.dimension7,
  };

  return {
    journalEntryType: analyticalLine.journalEntryType,
    journalEntryLine: analyticalLine.journalEntryNumber,
    lineNumber: analyticalLine.lineNumber,
    ledgerTypeNumber: LedgerTypeToLedgerTypeGQL[analyticalLine.ledgerTypeNumber],
    analyticalLineNumber: analyticalLine.analyticalLineNumber ?? undefined,
    site: analyticalLine.site ?? undefined,
    dimensions: dimensions,
    transactionAmount: analyticalLine.transactionAmount.toNumber() ?? undefined,
  };
}

/**
 * Maps the journal entry lines to a flat structure.
 */
function mapLineToEntity(line: JournalEntryLine & { analytics: JournalEntryAnalyticalLine[] }) {
  const debitOrCredit = line.sign > 0 ? 1 : 2;

  // LocalMenus.LedgerType.LEGAL
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
export function mapJournalEntryToEntity(journalEntry: JournalEntryWithRelations, isExcel: boolean): JournalEntryEntity {
  let linesToMap = journalEntry.lines;

  if (isExcel) {
    linesToMap = journalEntry.lines.filter((line) => line.ledgerTypeNumber === LocalMenus.LedgerType.LEGAL);
  }

  const mappedLines = linesToMap.map(mapLineToEntity);

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
    journalEntryLines: mappedLines,
  };
}
