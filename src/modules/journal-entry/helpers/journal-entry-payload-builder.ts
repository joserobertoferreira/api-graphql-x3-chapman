import { Prisma } from '@prisma/client';
import { DEFAULT_LEGACY_DATE } from '../../../common/types/common.types';
import { JournalEntryContext, JournalEntryLineContext } from '../../../common/types/journal-entry.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { ExchangeRateTypeGQLToExchangeRateType } from '../../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../../common/utils/enums/local-menu';

// Define a type for the payloads used to create a journal entry and its lines in the database
export type JournalEntryPayloads = {
  payload: Prisma.JournalEntryCreateInput;
  openItems: number;
};

type HeaderContext = {
  company: string;
  site: string;
  fiscalYear: number;
  period: number;
  accountingDate: Date;
};

/**
 * Builds the payloads required to create a journal entry along with its lines and analytical lines.
 *
 * @param context - The context containing necessary information for building the payloads.
 * @param uniqueNumbers - An array of unique numbers for each journal entry line.
 * @returns An object JournalEntryPayloads containing the header, lines, and analytics payloads.
 */
export async function buildJournalEntryPayloads(
  context: JournalEntryContext,
  uniqueNumbers: number[],
): Promise<JournalEntryPayloads> {
  // Build the header context
  const site = context.site || '';

  // Build the lines payload
  const dimensionTypes = context.dimensionTypes || [];

  const lines = buildLinesPayload(context.lines, uniqueNumbers, dimensionTypes, site);

  // Build the header payload
  const header = builderHeaderPayload(context, lines);

  return { payload: header, openItems: context.documentType.openItems || LocalMenus.NoYes.NO };
}

/** Builds the header payload for the journal entry.
 *
 * @param context - The context containing necessary information for building the header payload.
 * @param lines - The journal entry lines to build the header payload for.
 * @returns The header payload for the journal entry.
 */
function builderHeaderPayload(
  context: JournalEntryContext,
  lines: Prisma.JournalEntryLineCreateInput[],
): Prisma.JournalEntryCreateInput {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();

  let rateTypeKey = ExchangeRateTypeGQLToExchangeRateType.monthlyRate;

  if (context.documentType && context.rateType !== undefined) {
    rateTypeKey = ExchangeRateTypeGQLToExchangeRateType[context.rateType];
  }

  const payload: Prisma.JournalEntryCreateInput = {
    journalEntryType: context.documentType?.documentType ?? '',
    journal: context.documentType?.defaultJournal ?? '',
    company: context.company ?? '',
    accountingDate: context.accountingDate,
    journalEntryTransaction: context.journalEntryTransaction ?? '',
    category: context.category ?? '',
    typeOfOpenItem: context.typeOfOpenItem,
    fiscalYear: context.fiscalYear ?? 0,
    period: context.period ?? 0,
    description: context.descriptionByDefault ?? '',
    entryDate: context.entryDate ?? DEFAULT_LEGACY_DATE,
    dueDate: context.dueDate ?? DEFAULT_LEGACY_DATE,
    valueDate: context.valueDate ?? DEFAULT_LEGACY_DATE,
    sourceDocument: context.sourceDocument ?? '',
    sourceDocumentDate: context.sourceDocumentDate ?? DEFAULT_LEGACY_DATE,
    source: context.source ?? 1,
    vatDate: context.accountingDate,
    bankDate: context.accountingDate,
    reference: context.reference ?? '',
    rateType: rateTypeKey,
    rateDate: context.accountingDate,
    transactionCurrency: context.sourceCurrency ?? '',
    reminder: context.documentType?.reminders ?? LocalMenus.NoYes.YES,
    payApproval: LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
    lines: { create: lines },
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  const currencyRates = context.currencyRates;

  currencyRates.forEach((rateInfo, index) => {
    (payload as any)[`ledger${index + 1}`] = rateInfo.ledger?.trim() || '';
    (payload as any)[`referenceCurrency${index + 1}`] = rateInfo.destinationCurrency?.trim() || '';
    (payload as any)[`rateMultiplier${index + 1}`] = rateInfo.rate ?? new Prisma.Decimal(0);
    (payload as any)[`rateDivisor${index + 1}`] = rateInfo.divisor ?? new Prisma.Decimal(1);
  });

  return payload;
}

/** Builds the lines payload for the journal entry.
 *
 * @param context - The context containing necessary information for building the lines payload.
 * @param uniqueNumbers - An array of unique numbers for each line.
 * @param dimensionTypes - The dimension types defined in the journal entry context.
 * @returns An array of line payloads for the journal entry.
 */
function buildLinesPayload(
  context: JournalEntryLineContext[],
  uniqueNumbers: number[],
  dimensionTypes: string[],
  site: string,
): Prisma.JournalEntryLineCreateInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();
  const payload: Prisma.JournalEntryLineCreateInput[] = [];

  for (const [index, line] of context.entries()) {
    const uniqueNumber = uniqueNumbers[index] || 0;

    // Build the analytics payload
    const analyticsPayload = buildAnalyticsPayload(site, dimensionTypes, uniqueNumber, line);

    // Build the line payload
    const linePayload: Prisma.JournalEntryLineCreateInput = {
      ledgerTypeNumber: line.ledgerType ?? 1,
      ledger: line.ledger ?? '',
      site: site,
      uniqueNumber: uniqueNumber,
      lineNumber: line.lineNumber,
      identifier: String(line.lineNumber),
      chartOfAccounts: line.planCode ?? '',
      controlAccount: line.collective ?? '',
      account: line.account ?? '',
      businessPartner: line.businessPartner ?? '',
      sign: line.amounts.debitOrCredit ?? 0,
      transactionCurrency: line.amounts.currency ?? '',
      transactionAmount: line.amounts.currencyAmount ?? new Prisma.Decimal(0),
      ledgerCurrency: line.amounts.ledgerCurrency ?? '',
      ledgerAmount: line.amounts.ledgerAmount ?? new Prisma.Decimal(0),
      lineDescription: line.description ?? '',
      freeReference: line.freeReference ?? '',
      tax1: line.taxCode ?? '',
      analytics: { create: analyticsPayload },
      createDatetime: timestamps.dateTime,
      updateDatetime: timestamps.dateTime,
      singleID: headerUUID,
    };

    payload.push(linePayload);
  }

  return payload;
}

/** Builds the analytics payload for the journal entry lines.
 *
 * @param dimensionTypes - The dimension types defined in the journal entry context.
 * @param uniqueNumber - The unique number for the line.
 * @param context - The journal entry lines to build analytics for.
 * @returns An array of analytical line payloads for the journal entry.
 */
function buildAnalyticsPayload(
  site: string,
  dimensionTypes: string[],
  uniqueNumber: number,
  context: JournalEntryLineContext,
): Prisma.JournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();
  const payload: Prisma.JournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput[] = [];

  const dimensionPositionMap = new Map<string, number>();
  dimensionTypes.forEach((dim, index) => {
    if (dim && dim.trim() !== '') {
      dimensionPositionMap.set(dim, index + 1);
    }
  });

  const lineDimensions = context.dimensions;

  const linePayload: Prisma.JournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput = {
    analyticalLineNumber: context.lineNumber,
    identifier: String(context.lineNumber),
    site: site,
    uniqueNumber: uniqueNumber,
    chartOfAccounts: context.planCode ?? '',
    account: context.account ?? '',
    businessPartner: context.businessPartner ?? '',
    sign: context.amounts.debitOrCredit ?? 0,
    currency: context.amounts.currency ?? '',
    transactionAmount: context.amounts.currencyAmount ?? new Prisma.Decimal(0),
    referenceCurrency: context.amounts.ledgerCurrency ?? '',
    referenceAmount: context.amounts.ledgerAmount ?? new Prisma.Decimal(0),
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  for (const dim of dimensionPositionMap.keys()) {
    const position = dimensionPositionMap.get(dim);
    if (position) {
      (linePayload as any)[`dimensionType${position}`] = dim;
    }
  }

  if (lineDimensions) {
    for (const dim of lineDimensions) {
      const position = dimensionPositionMap.get(dim.typeCode);
      if (position) {
        (linePayload as any)[`dimension${position}`] = dim.value;
      }
    }
  }

  payload.push(linePayload);

  return payload;
}
