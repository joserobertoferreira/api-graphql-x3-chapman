import { LocalMenus } from '@chapman/utils';
import { Prisma } from 'src/generated/prisma';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { DimensionTypeConfig } from '../../../common/types/dimension.types';
import {
  HeaderContext,
  IntercompanyJournalEntryContext,
  IntercompanyJournalEntryLineContext,
  JournalEntryAnalyticalLineInfo,
  JournalEntryRateCurrency,
} from '../../../common/types/journal-entry.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { toDecimal } from '../../../common/utils/decimal.utils';
import { ExchangeRateTypeGQLToExchangeRateType } from '../../../common/utils/enums/convert-enum';

/**
 * Builds the payloads required to create a journal entry along with its lines and analytical lines.
 *
 * @param context - The context containing necessary information for building the payloads.
 * @returns An object JournalEntryPayloads containing the header, lines, analytics, open items,
 * archive open items payloads.
 */
export async function buildIntercompanyJournalEntryPayloads(
  context: IntercompanyJournalEntryContext,
): Promise<Prisma.IntercompanyJournalEntryCreateInput> {
  // Build the header context
  const headerContext: HeaderContext = {
    company: context.company || '',
    site: context.site || '',
    fiscalYear: context.fiscalYear || 0,
    period: context.period || 0,
    accountingDate: context.accountingDate,
    documentType: context.documentType!,
    currency: context.currency || '',
    description: context.description || '',
  };

  // Build the header payload without lines
  const partialHeader = builderIntercompanyHeaderPayload(context);

  // Build the lines payload
  const linesPayload = buildIntercompanyLinesPayload(
    context.lines,
    context.dimensionTypesMap,
    headerContext,
    context.currencyRates,
  );

  // Assign lines to header
  const header: Prisma.IntercompanyJournalEntryCreateInput = {
    ...partialHeader,
    currency: context.currency || '',
    lines: { create: linesPayload },
  };

  return header;
}

/** Builds the header payload for the intercompany journal entry.
 *
 * @param context - The context containing necessary information for building the header payload.
 * @returns The header payload for the journal entry.
 */
function builderIntercompanyHeaderPayload(
  context: IntercompanyJournalEntryContext,
): Prisma.IntercompanyJournalEntryCreateInput {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();

  let rateTypeKey = ExchangeRateTypeGQLToExchangeRateType.monthlyRate;
  let rateDate = context.accountingDate;

  if (context.documentType && context.rateType !== undefined) {
    rateTypeKey = ExchangeRateTypeGQLToExchangeRateType[context.rateType];
  }
  if (context.rateDate && context.rateDate !== context.accountingDate) {
    rateDate = context.rateDate;
  }

  const payload: Prisma.IntercompanyJournalEntryCreateInput = {
    journalEntryType: context.documentType?.documentType || '',
    journal: context.documentType?.defaultJournal || '',
    company: context.company || '',
    site: context.site || '',
    accountingDate: context.accountingDate,
    fiscalYear: context.fiscalYear || 0,
    period: context.period || 0,
    description: context.description?.trim() || '',
    rateType: rateTypeKey,
    rateDate: rateDate,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createTime: timestamps.timeInSeconds,
    updateTime: timestamps.timeInSeconds,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  const currencyRates = context.currencyRates;

  currencyRates.forEach((rateInfo, index) => {
    (payload as any)[`ledger${index + 1}`] = rateInfo.ledger?.trim() ?? '';
    (payload as any)[`referenceCurrency${index + 1}`] = rateInfo.destinationCurrency?.trim() ?? '';
    (payload as any)[`rateMultiplier${index + 1}`] = rateInfo.rate ?? new Prisma.Decimal(1);
    (payload as any)[`rateDivisor${index + 1}`] = rateInfo.divisor ?? new Prisma.Decimal(1);
  });

  return payload;
}

/** Builds the lines payload for the journal entry.
 *
 * @param context - The context containing necessary information for building the lines payload.
 * @param dimensionTypesMap - A map of dimension types for the journal entry.
 * @param headerContext - The header context for the journal entry.
 * @returns An object containing the lines payload and business partner info.
 */
function buildIntercompanyLinesPayload(
  context: IntercompanyJournalEntryLineContext[],
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  headerContext: HeaderContext,
  currencyRates: JournalEntryRateCurrency[],
): Prisma.IntercompanyJournalEntryLineCreateWithoutJournalEntryInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();

  const linesMap = new Map<string, Prisma.IntercompanyJournalEntryLineCreateWithoutJournalEntryInput>();
  const dimensionsMap = new Map<string, DimensionsInput | undefined>();

  let businessPartner = '';

  for (const line of context) {
    const lineKey = `${line.site}|${line.account}`;

    if (!linesMap.has(lineKey)) {
      // Determine the business partner for the line
      if (line.collective?.trim() !== '') {
        for (const bpInfo of line.businessPartner || []) {
          businessPartner = bpInfo.code || '';
          break;
        }
      }

      // Map the dimensions from line
      dimensionsMap.set(lineKey, line.dimensions);

      // Build the line payload
      linesMap.set(lineKey, {
        lineNumber: line.lineNumber,
        site: line.site,
        company: line.company?.companyCode || '',
        journalEntryType: headerContext.documentType?.documentType || '',
        journal: headerContext.documentType?.defaultJournal || '',
        businessPartner: businessPartner.trim(),
        ledgerTypeNumber1: LocalMenus.LedgerType.LEGAL,
        ledgerTypeNumber2: LocalMenus.LedgerType.LEGAL,
        ledger1: line.ledger?.trim() || '',
        chartOfAccounts1: line.planCode || '',
        controlAccount1: line.collective?.trim() || '',
        account1: line.account?.trim() || '',
        sign: line.amounts.debitOrCredit || 1,
        transactionCurrency: line.amounts.currency || '',
        transactionAmount: line.amounts.currencyAmount || new Prisma.Decimal(0),
        quantity: line.quantity || new Prisma.Decimal(0),
        nonFinancialUnit: line.nonFinancialUnit || '',
        lineDescription: line.lineDescription?.trim() || headerContext.description?.trim() || '',
        tax: line.taxCode?.trim() || '',
        createDatetime: timestamps.dateTime,
        updateDatetime: timestamps.dateTime,
        singleID: headerUUID,
      });
    }

    const currentLine = linesMap.get(lineKey)!;

    currencyRates.forEach((rateInfo, index) => {
      (currentLine as any)[`rateMultiplier${index + 1}`] = rateInfo.rate ?? new Prisma.Decimal(1);
      (currentLine as any)[`rateDivisor${index + 1}`] = rateInfo.divisor ?? new Prisma.Decimal(1);
    });

    // const index = line.ledgerType;

    // (currentLine as any)[`ledgerTypeNumber${index}`] = line.ledgerType;
    // (currentLine as any)[`ledger${index}`] = line.ledger?.trim() || '';
    // (currentLine as any)[`chartOfAccounts${index}`] = line.planCode || '';
    // (currentLine as any)[`controlAccount${index}`] = line.collective?.trim() || '';
    // (currentLine as any)[`account${index}`] = line.account?.trim() || '';
  }

  // Build the analytics payload
  for (const [lineKey, line] of linesMap.entries()) {
    const dimensions = dimensionsMap.get(lineKey);
    const lineContext: JournalEntryAnalyticalLineInfo = {
      transactionAmount: toDecimal(line.transactionAmount as any),
      quantity: toDecimal(line.quantity as any),
      nonFinancialUnit: line.nonFinancialUnit || '',
      chartOfAccounts: line.chartOfAccounts1 || '',
      account: line.account1 || '',
      dimensions: dimensions,
    };
    const analyticsPayload = buildIntercompanyAnalyticsPayload(dimensionTypesMap, lineContext);

    (line as any).analyticalLines = { create: analyticsPayload };
  }

  return Array.from(linesMap.values());
}

/** Builds the analytics payload for the journal entry lines.
 *
 * @param dimensionTypes - The dimension types defined in the journal entry context.
 * @param lineDimensions - The dimensions associated with the journal entry line.
 * @param context - The journal entry lines to build analytics for.
 * @returns An array of analytical line payloads for the journal entry.
 */
function buildIntercompanyAnalyticsPayload(
  dimensionTypes: Map<string, DimensionTypeConfig>,
  context: JournalEntryAnalyticalLineInfo,
): Prisma.IntercompanyJournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();

  const linePayload: Prisma.IntercompanyJournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput = {
    analyticalLineNumber: 1,
    chartOfAccounts1: context.chartOfAccounts || '',
    account1: context.account || '',
    transactionAmount: context.transactionAmount || new Prisma.Decimal(0),
    quantity: context.quantity || new Prisma.Decimal(0),
    nonFinancialUnit: context.nonFinancialUnit || '',
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  // for (let i = 1; i <= 10; i++) {
  //   const chartKey = `chartOfAccounts${i}` as keyof typeof context;
  //   const accountKey = `account${i}` as keyof typeof context;

  //   if (context[chartKey]) {
  //     (linePayload as any)[chartKey] = context[chartKey];
  //   }
  //   if (context[accountKey]) {
  //     (linePayload as any)[accountKey] = context[accountKey];
  //   }
  // }

  if (context.dimensions) {
    for (const [field, type] of dimensionTypes.entries()) {
      const fieldNumber = type.fieldNumber;

      (linePayload as any)[`dimensionType${fieldNumber}`] = type.code;

      if (context.dimensions[field]) {
        (linePayload as any)[`dimension${fieldNumber}`] = context.dimensions[field];
      }
    }
  }

  return [linePayload];
}
