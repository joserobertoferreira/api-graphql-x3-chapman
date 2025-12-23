import { DEFAULT_LEGACY_DATE } from 'src/common/types/common.types';
import { DimensionTypeConfig } from 'src/common/types/dimension.types';
import {
  HeaderContext,
  JournalEntryContext,
  JournalEntryLineContext,
  JournalEntryPayloads,
  LinesPayloadResult,
} from 'src/common/types/journal-entry.types';
import { OpenItemBusinessPartnerInfo } from 'src/common/types/opem-item.types';
import { generateUUIDBuffer, getAuditTimestamps } from 'src/common/utils/audit-date.utils';
import { ExchangeRateTypeGQLToExchangeRateType } from 'src/common/utils/enums/convert-enum';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { Prisma } from 'src/generated/prisma/client';

/**
 * Builds the payloads required to create a journal entry along with its lines and analytical lines.
 *
 * @param context - The context containing necessary information for building the payloads.
 * @param uniqueNumbers - An array of unique numbers for each journal entry line.
 * @returns An object JournalEntryPayloads containing the header, lines, analytics, open items,
 * archive open items payloads.
 */
export async function buildJournalEntryPayloads(
  context: JournalEntryContext,
  uniqueNumbers: number[],
  currentUser: string | undefined,
): Promise<JournalEntryPayloads> {
  // Build the header context
  const headerContext: HeaderContext = {
    company: context.company || '',
    site: context.site || '',
    fiscalYear: context.fiscalYear || 0,
    period: context.period || 0,
    accountingDate: context.accountingDate,
    documentType: context.documentType!,
    currency: context.sourceCurrency || '',
    currentUser: currentUser || 'INTER',
  };

  // Build the lines payload
  const { linesPayload, partnerInfo } = buildLinesPayload(
    context.lines,
    uniqueNumbers,
    context.dimensionTypesMap,
    headerContext,
  );

  // Build the open items payload
  const openItems: Prisma.OpenItemCreateInput[] = [];
  for (const line of linesPayload) {
    if (
      line.ledgerTypeNumber === LocalMenus.LedgerType.LEGAL &&
      line.businessPartner &&
      line.businessPartner?.trim() !== '' &&
      line.controlAccount &&
      line.controlAccount?.trim() !== ''
    ) {
      const openItem = buildOpenItemPayload(line, partnerInfo, headerContext);

      if (openItem && openItem.length > 0) {
        openItems.push(...openItem);
      }
    }
  }

  // Build the header payload
  const header = builderHeaderPayload(currentUser, context, linesPayload);

  return { payload: header, openItems: openItems };
}

/** Builds the header payload for the journal entry.
 *
 * @param currentUser - The current user performing the operation.
 * @param context - The context containing necessary information for building the header payload.
 * @param lines - The journal entry lines to build the header payload for.
 * @returns The header payload for the journal entry.
 */
function builderHeaderPayload(
  currentUser: string | undefined,
  context: JournalEntryContext,
  lines: Prisma.JournalEntryLineCreateInput[],
): Prisma.JournalEntryCreateInput {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer().slice(0);

  let rateTypeKey = ExchangeRateTypeGQLToExchangeRateType.monthlyRate;

  if (context.documentType && context.rateType !== undefined) {
    rateTypeKey = ExchangeRateTypeGQLToExchangeRateType[context.rateType];
  }

  let isReversing = LocalMenus.NoYes.NO;
  if (context.isReversing !== undefined && context.isReversing) {
    isReversing = LocalMenus.NoYes.YES;
  }

  const payload: Prisma.JournalEntryCreateInput = {
    journalEntryType: context.documentType?.documentType || '',
    journal: context.documentType?.defaultJournal || '',
    journalEntryTransaction: context.journalEntryTransaction || '',
    entryDate: context.entryDate || context.accountingDate,
    dueDate: context.dueDate || context.accountingDate,
    valueDate: context.valueDate || context.accountingDate,
    sourceDocument: context.sourceDocument?.trim() || '',
    sourceDocumentDate: context.sourceDocumentDate || DEFAULT_LEGACY_DATE,
    reference: context.reference?.trim() || '',
    company: context.company || '',
    site: context.site || '',
    accountingDate: context.accountingDate,
    category: context.category || '',
    typeOfOpenItem: context.typeOfOpenItem,
    fiscalYear: context.fiscalYear || 0,
    period: context.period || 0,
    description: context.descriptionByDefault?.trim() || '',
    source: context.source || 1,
    vatDate: context.vatDate || context.accountingDate,
    bankDate: context.accountingDate,
    rateType: rateTypeKey,
    rateDate: context.rateDate || context.accountingDate,
    transactionCurrency: context.sourceCurrency || '',
    reversing: isReversing,
    reversingDate: context.reversingDate || DEFAULT_LEGACY_DATE,
    reminder: context.documentType?.reminders || LocalMenus.NoYes.YES,
    payApproval: LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
    excelFileName: context.sourceFile || '',
    lines: { create: lines },
    createUser: currentUser || 'INTER',
    createDate: timestamps.date,
    updateUser: currentUser || 'INTER',
    updateDate: timestamps.date,
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
 * @param uniqueNumbers - An array of unique numbers for each line.
 * @param dimensionTypes - The dimension types defined in the journal entry context.
 * @param headerContext - The header context for the journal entry.
 * @returns An object containing the lines payload and business partner info.
 */
function buildLinesPayload(
  context: JournalEntryLineContext[],
  uniqueNumbers: number[],
  dimensionTypes: Map<string, DimensionTypeConfig>,
  headerContext: HeaderContext,
): LinesPayloadResult {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer().slice(0);
  const payload: Prisma.JournalEntryLineCreateInput[] = [];
  const partnerInfo: OpenItemBusinessPartnerInfo = {};

  for (const [index, line] of context.entries()) {
    const uniqueNumber = uniqueNumbers[index] || 0;

    // Determine the business partner for the line
    let businessPartner = '';
    if (line.collective?.trim() !== '') {
      for (const bpInfo of line.businessPartner || []) {
        businessPartner = bpInfo.code || '';
        if (businessPartner) {
          partnerInfo.code = businessPartner;

          if (bpInfo.customer && bpInfo.isCustomer === LocalMenus.NoYes.YES) {
            partnerInfo.partnerType = LocalMenus.BusinessPartnerType.CUSTOMER;
            partnerInfo.payToOrPayBy = bpInfo.customer.payByCustomer;
            partnerInfo.partnerAddress = bpInfo.customer.payByCustomerAddress;
          } else if (bpInfo.isSupplier === LocalMenus.NoYes.YES && bpInfo.supplier) {
            partnerInfo.partnerType = LocalMenus.BusinessPartnerType.SUPPLIER;
            partnerInfo.payToOrPayBy = bpInfo.supplier.payToBusinessPartner;
            partnerInfo.partnerAddress = bpInfo.supplier.payToBusinessPartnerAddress;
          }
          partnerInfo.paymentMethod = bpInfo.paymentMethod || '';
          partnerInfo.paymentType = bpInfo.paymentType || 0;
          break;
        }
      }
    }

    // Build the analytics payload
    const analyticsPayload = buildAnalyticsPayload(headerContext, dimensionTypes, uniqueNumber, businessPartner, line);

    // Build the line payload
    const linePayload: Prisma.JournalEntryLineCreateInput = {
      ledgerTypeNumber: line.ledgerType || 1,
      ledger: line.ledger || '',
      company: headerContext.company,
      site: headerContext.site,
      accountingDate: headerContext.accountingDate,
      fiscalYear: headerContext.fiscalYear,
      period: headerContext.period,
      uniqueNumber: uniqueNumber,
      lineNumber: line.lineNumber,
      identifier: String(line.lineNumber),
      chartOfAccounts: line.planCode || '',
      controlAccount: line.collective?.trim() || '',
      account: line.account?.trim() || '',
      businessPartner: businessPartner.trim(),
      sign: line.amounts.debitOrCredit || 1,
      transactionCurrency: line.amounts.currency || '',
      transactionAmount: line.amounts.currencyAmount || new Prisma.Decimal(0),
      ledgerCurrency: line.amounts.ledgerCurrency || '',
      ledgerAmount: line.amounts.ledgerAmount || new Prisma.Decimal(0),
      quantity: line.quantity || new Prisma.Decimal(0),
      nonFinancialUnit: line.nonFinancialUnit || '',
      lineDescription: line.lineDescription?.trim() || '',
      freeReference: line.freeReference?.trim() || '',
      tax1: line.taxCode?.trim() || '',
      analytics: { create: analyticsPayload },
      createUser: headerContext.currentUser || 'INTER',
      updateUser: headerContext.currentUser || 'INTER',
      createDatetime: timestamps.dateTime,
      updateDatetime: timestamps.dateTime,
      singleID: headerUUID,
    };

    payload.push(linePayload);
  }

  return { linesPayload: payload, partnerInfo };
}

/** Builds the analytics payload for the journal entry lines.
 *
 * @param headerContext - The header context for the journal entry.
 * @param dimensionTypes - The dimension types defined in the journal entry context.
 * @param uniqueNumber - The unique number for the line.
 * @param businessPartner - The business partner information for the line.
 * @param context - The journal entry lines to build analytics for.
 * @returns An array of analytical line payloads for the journal entry.
 */
function buildAnalyticsPayload(
  headerContext: HeaderContext,
  dimensionTypes: Map<string, DimensionTypeConfig>,
  uniqueNumber: number,
  businessPartner: string,
  context: JournalEntryLineContext,
): Prisma.JournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer().slice(0);

  const linePayload: Prisma.JournalEntryAnalyticalLineCreateWithoutJournalEntryLineInput = {
    analyticalLineNumber: context.lineNumber,
    identifier: String(context.lineNumber),
    ledger: context.ledger || '',
    company: headerContext.company,
    site: headerContext.site,
    accountingDate: headerContext.accountingDate,
    uniqueNumber: uniqueNumber,
    chartOfAccounts: context.planCode?.trim() || '',
    account: context.account || '',
    businessPartner: businessPartner.trim(),
    sign: context.amounts.debitOrCredit || 1,
    currency: context.amounts.currency || '',
    transactionAmount: context.amounts.currencyAmount || new Prisma.Decimal(0),
    referenceCurrency: context.amounts.ledgerCurrency || '',
    referenceAmount: context.amounts.ledgerAmount || new Prisma.Decimal(0),
    quantity: context.quantity || new Prisma.Decimal(0),
    nonFinancialUnit: context.nonFinancialUnit || '',
    createUser: headerContext.currentUser || 'INTER',
    updateUser: headerContext.currentUser || 'INTER',
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  const lineDimensions = context.dimensions;

  if (lineDimensions) {
    for (const [field, type] of dimensionTypes.entries()) {
      const typeCode = type.code;
      const fieldNumber = type.fieldNumber;

      (linePayload as any)[`dimensionType${fieldNumber}`] = typeCode;

      if (lineDimensions[field]) {
        const value = lineDimensions[field];
        (linePayload as any)[`dimension${fieldNumber}`] = value;
      }
    }
  }

  return [linePayload];
}

/** Builds the open item payload for the journal entry.
 *
 * @param line - The journal entry line to build the open items for.
 * @param businessPartnerInfo - The business partner information for the line.
 * @param headerContext - The header context for the journal entry.
 * @returns An array of open item payloads for the journal entry line.
 */
function buildOpenItemPayload(
  line: Prisma.JournalEntryLineCreateInput,
  businessPartnerInfo: OpenItemBusinessPartnerInfo,
  headerContext: HeaderContext,
): Prisma.OpenItemCreateInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer().slice(0);
  // const payload: Prisma.OpenItemCreateInput[] = [];
  const uniqueNumber = `${line.uniqueNumber}/${line.lineNumber}`;

  const linePayload: Prisma.OpenItemCreateInput = {
    documentType: headerContext.documentType?.documentType || '',
    lineNumber: line.lineNumber,
    openItemLineNumber: line.lineNumber,
    company: line.company,
    site: line.site,
    currency: headerContext.currency,
    controlAccount: line.controlAccount,
    businessPartner: businessPartnerInfo.code || '',
    businessPartnerType: businessPartnerInfo.partnerType || 0,
    payToOrPayByBusinessPartner: businessPartnerInfo.payToOrPayBy || '',
    businessPartnerAddress: businessPartnerInfo.partnerAddress || '',
    dueDate: line.accountingDate || new Date(),
    paymentMethod: businessPartnerInfo.paymentMethod || '',
    paymentType: businessPartnerInfo.paymentType || 0,
    sign: line.sign || 0,
    amountInCurrency: line.transactionAmount || new Prisma.Decimal(0),
    amountInCompanyCurrency: line.ledgerAmount || new Prisma.Decimal(0),
    canBeReminded: LocalMenus.NoYes.YES,
    paymentApprovalLevel: LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
    postedStatus: 2,
    closedStatus: 1,
    fiscalYear: line.fiscalYear || 0,
    period: line.period || 0,
    typeOfOpenItem: headerContext.documentType?.openItemType || 0,
    uniqueNumber: uniqueNumber,
    journalEntryLineInternalNumber: line.uniqueNumber || 0,
    createDate: timestamps.date,
    createUser: headerContext.currentUser || 'INTER',
    updateUser: headerContext.currentUser || 'INTER',
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  return [linePayload];
}

/** Builds the archive payload for the journal entry open items.
 *
 * @param line - The open item line to build the archive for.
 * @param identifiers - The identifiers for the archive payload.
 * @param currentUser - The current user performing the operation.
 * @returns An array of archive open item payloads for the open item line.
 */
export function buildOpenItemArchivePayload(
  line: Prisma.OpenItemCreateInput,
  identifiers: number[],
  currentUser: string | undefined,
): Prisma.OpenItemArchiveCreateInput[] {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer().slice(0);

  if (identifiers.length === 0) {
    return [];
  }

  // Assuming one identifier per line for simplicity
  // If multiple identifiers are needed, this logic can be adjusted accordingly
  // Here we just take the first identifier for the example
  // In a future scenario, you might want to map identifiers to specific lines
  const archivePayload: Prisma.OpenItemArchiveCreateInput = {
    identifier: identifiers[0],
    documentType: line.documentType,
    lineNumber: line.lineNumber,
    dueDateNumber: line.openItemLineNumber,
    internalNumber: line.journalEntryLineInternalNumber,
    company: line.company,
    site: line.site,
    currency: line.currency,
    collective: line.controlAccount,
    businessPartner: line.businessPartner,
    businessPartnerType: line.businessPartnerType,
    payToBusinessPartner: line.payToOrPayByBusinessPartner,
    dueDate: line.dueDate,
    sign: line.sign,
    amountInCurrency: line.amountInCurrency,
    amountInCompanyCurrency: line.amountInCompanyCurrency,
    paymentApprovalLevel: line.paymentApprovalLevel,
    postedStatus: line.postedStatus,
    closedStatus: line.closedStatus,
    typeOfOpenItem: line.typeOfOpenItem,
    eventDate: timestamps.date,
    createDate: timestamps.date,
    createUser: currentUser || 'INTER',
    updateUser: currentUser || 'INTER',
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  return [archivePayload];
}
