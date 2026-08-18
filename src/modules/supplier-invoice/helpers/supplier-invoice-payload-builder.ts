import { DEFAULT_LEGACY_DATE } from 'src/common/types/common.types';
import { DimensionTypeConfig } from 'src/common/types/dimension.types';
import {
  SupplierInvoiceBusinessPartnerInfo,
  SupplierInvoiceContext,
  SupplierInvoiceHeaderContext,
  SupplierInvoiceLineContext,
  SupplierInvoiceLineGroup,
  SupplierInvoiceLinesPayloadResult,
  SupplierInvoiceLineTotalAmount,
  SupplierInvoicePayloads,
} from 'src/common/types/supplier-invoice.types';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { DocumentTypes, Prisma } from 'src/generated/prisma/client';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { CommonService } from '../../common/common.service';

/**
 * Builds the payloads required to create a supplier invoice along with its lines and analytical lines.
 *
 * SupplierInvoiceLines and AnalyticalSupplierLine have no Prisma relation to
 * SupplierInvoiceHeader (they are matched manually by the `document` column),
 * so `document` is intentionally left unset on every row returned here - the
 * caller fills it in once the invoiceNumber has been generated.
 *
 * @param context - The context containing necessary information for building the payloads.
 * @param currentUser - The user performing the operation.
 * @param internalNumber - The internal sequence number for the header (SEQ_PINVOICE).
 * @param isExcel - A boolean to indicate if the record send by excel.
 * @param commonService Common Service functions.
 * @returns An object SupplierInvoicePayloads containing the header, lines, analytics and open items payloads.
 */
export async function buildSupplierInvoicePayloads(
  context: SupplierInvoiceContext,
  currentUser: string | undefined,
  internalNumber: number,
  isExcel: boolean,
  commonService: CommonService,
): Promise<SupplierInvoicePayloads> {
  // Build the header context
  const headerContext: SupplierInvoiceHeaderContext = {
    internalNumber: internalNumber,
    supplier: context.supplier,
    collective: context.collective,
    company: context.companyInfo.companyCode || '',
    site: context.site || '',
    fiscalYear: context.fiscalYear || 0,
    period: context.period || 0,
    accountingDate: context.accountingDate,
    invoiceType: context.invoiceType,
    documentType: context.documentType || '',
    invoiceTypeIsValid: context.invoiceTypeIsValid,
    currency: context.currency || '',
    isExcel: isExcel,
    ...(isExcel && { currentUser: currentUser?.toUpperCase() || 'INTER' }),
  };

  // Build the lines payload
  const { linesPayload, lineGroups, taxTotalsByCode } = buildLinesPayload(context.lines, headerContext);

  // Build the analytical lines payload
  const analyticalLinesPayload = buildAnalyticsPayload(headerContext, context.dimensionTypesMap, lineGroups);

  // Build the header payload (dimension values are inherited from the first analytical line)
  const header = builderHeaderPayload(
    context,
    internalNumber,
    currentUser,
    isExcel,
    taxTotalsByCode,
    analyticalLinesPayload[0],
  );

  // Build the open items payload
  const openItems = await buildOpenItemPayload(
    commonService,
    header,
    lineGroups,
    context.businessPartnerInfo,
    context.documentType,
  );

  return { payload: header, lines: linesPayload, analyticalLines: analyticalLinesPayload, openItems };
}

/** Builds the header payload for the supplier invoice.
 *
 * @param context - The context containing necessary information for building the header payload.
 * @param internalNumber - The internal sequence number for the header (SEQ_GACCENTRYD).
 * @param currentUser - The user performing the operation.
 * @param isExcel - A boolean to indicate if the record send by excel.
 * @param taxTotalsByCode - A map summing amounts by tax code.
 * @param firstAnalyticalLine - The first analytical line built for this invoice, used to
 * inherit its dimension values (CCE_n) onto the header, alongside their types (DIE_n).
 * @returns The header payload for the supplier invoice.
 */
function builderHeaderPayload(
  context: SupplierInvoiceContext,
  internalNumber: number,
  currentUser: string | undefined,
  isExcel: boolean,
  taxTotalsByCode: Map<string, SupplierInvoiceLineTotalAmount>,
  firstAnalyticalLine: Prisma.AnalyticalSupplierLineCreateManyInput | undefined,
): Prisma.SupplierInvoiceHeaderCreateInput {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer().slice(0);

  const invoiceTotals = Array.from(taxTotalsByCode.values()).reduce(
    (totals, current) => ({
      totalAmountExcludingTax: totals.totalAmountExcludingTax.plus(current.totalAmountExcludingTax),
      totalAmountIncludingTax: totals.totalAmountIncludingTax.plus(current.totalAmountIncludingTax),
      totalTaxAmount: totals.totalTaxAmount.plus(current.totalTaxAmount),
    }),
    {
      totalAmountExcludingTax: new Prisma.Decimal(0),
      totalAmountIncludingTax: new Prisma.Decimal(0),
      totalTaxAmount: new Prisma.Decimal(0),
    },
  );

  const billBySupplierAddress = context.supplierInfo?.businessPartner?.defaultAddress.trim() || '';
  const billBySupplierName1 = context.supplierInfo?.businessPartner?.partnerName1 || '';
  const billBySupplierName2 = context.supplierInfo?.businessPartner?.partnerName2 || '';
  const billBySupplierAddressLine1 = context.supplierInfo?.addresses[0]?.addressLine1 || '';
  const billBySupplierAddressLine2 = context.supplierInfo?.addresses[0]?.addressLine2 || '';
  const billBySupplierAddressLine3 = context.supplierInfo?.addresses[0]?.addressLine3 || '';
  const billBySupplierPostalCode = context.supplierInfo?.addresses[0]?.zipCode || '';
  const billBySupplierCity = context.supplierInfo?.addresses[0]?.city || '';
  const billBySupplierState = context.supplierInfo?.addresses[0]?.state || '';
  const billBySupplierCountry = context.supplierInfo?.addresses[0]?.country || '';
  const billBySupplierCountryName = context.supplierInfo?.addresses[0]?.countryName || '';

  const debitOrCredit = [2, 3].includes(context.invoiceTypeIsValid?.invoiceCategory ?? 0) ? -1 : 1;
  const createUser = isExcel ? currentUser?.toUpperCase() : 'INTER';
  const updateUser = isExcel ? currentUser?.toUpperCase() : 'INTER';

  const payload: Prisma.SupplierInvoiceHeaderCreateInput = {
    category: context.invoiceTypeIsValid?.invoiceCategory || LocalMenus.InvoiceType.INVOICE,
    invoiceType: context.invoiceType,
    // purchaseInvoiceCategory:
    //   context.invoiceTypeIsValid?.purchaseInvoiceCategory || LocalMenus.PurchaseInvoiceType.INVOICE,
    billBySupplier: context.supplier?.trim() || '',
    collective: context.collective?.trim() || '',
    company: context.companyInfo.companyCode || '',
    site: context.site || '',
    entryType: context.documentType?.documentType.trim() || '',
    journal: context.invoiceTypeIsValid?.journal.trim() || '',
    accountingDate: context.accountingDate,
    internalNumber: internalNumber,
    sourceDocument: context.sourceDocument?.trim() || '',
    sourceDocumentDate: context.sourceDocumentDate || DEFAULT_LEGACY_DATE,
    sourceModule: LocalMenus.ModuleTable.AP_AR_ACCOUNTING,
    currency: context.currency || '',
    rateType: context.documentType.rateType,
    rateDate: context.accountingDate,
    originalInvoiceNumber: context.originalInvoiceNumber?.trim() || '',
    payToBusinessPartner: context.payToBusinessPartner?.trim() || context.supplier?.trim() || '',
    dueDateCalculationStartDate: context.dueDateCalculationStartDate,
    paymentTerm: context.payToBusinessPartnerInfo?.paymentTerm,
    status: LocalMenus.PurchaseInvoiceStatus.TO_CONFIRM,
    paymentApproval: context.paymentApproval,
    taxRule: context.taxRule?.trim() || '',
    totalAmountExcludingTax: invoiceTotals.totalAmountExcludingTax,
    totalAmountIncludingTax: invoiceTotals.totalAmountIncludingTax,
    billBySupplierAddress: billBySupplierAddress,
    billBySupplierName1: billBySupplierName1,
    billBySupplierName2: billBySupplierName2,
    billBySupplierAddressLine1: billBySupplierAddressLine1,
    billBySupplierAddressLine2: billBySupplierAddressLine2,
    billBySupplierAddressLine3: billBySupplierAddressLine3,
    billBySupplierPostalCode: billBySupplierPostalCode,
    billBySupplierCity: billBySupplierCity,
    billBySupplierState: billBySupplierState,
    billBySupplierCountry: billBySupplierCountry,
    billBySupplierCountryName: billBySupplierCountryName,
    payToBusinessPartnerAddress:
      context.payToBusinessPartnerInfo?.businessPartner?.defaultAddress.trim() || billBySupplierAddress,
    payToBusinessPartnerName: context.payToBusinessPartnerInfo?.businessPartner?.partnerName1 || billBySupplierName1,
    payToBusinessPartnerName2: context.payToBusinessPartnerInfo?.businessPartner?.partnerName2 || billBySupplierName2,
    payToBusinessPartnerAddressLine1:
      context.payToBusinessPartnerInfo?.addresses[0]?.addressLine1 || billBySupplierAddressLine1,
    payToBusinessPartnerAddressLine2:
      context.payToBusinessPartnerInfo?.addresses[0]?.addressLine2 || billBySupplierAddressLine2,
    payToBusinessPartnerAddressLine3:
      context.payToBusinessPartnerInfo?.addresses[0]?.addressLine2 || billBySupplierAddressLine3,
    payToBusinessPartnerPostalCode: context.payToBusinessPartnerInfo?.addresses[0]?.zipCode || billBySupplierPostalCode,
    payToBusinessPartnerCity: context.payToBusinessPartnerInfo?.addresses[0]?.city || billBySupplierCity,
    payToBusinessPartnerState: context.payToBusinessPartnerInfo?.addresses[0]?.state || billBySupplierState,
    payToBusinessPartnerCountry: context.payToBusinessPartnerInfo?.addresses[0]?.country || billBySupplierCountry,
    payToBusinessPartnerCountryName:
      context.payToBusinessPartnerInfo?.addresses[0]?.countryName || billBySupplierCountryName,
    fiscalYear: context.fiscalYear,
    period: context.period,
    priceOrAmountTaxType: 1,
    debitOrCredit: debitOrCredit,
    exportNumber: context.exportNumber,
    createUser: createUser,
    updateUser: updateUser,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  const currencyRates = context.currencyRates;

  currencyRates.forEach((rateInfo, index) => {
    const payloadRecord = payload as Record<string, unknown>;
    const ledgerIndex = index + 1;

    const trimmedLedger = rateInfo.ledger?.trim() ?? '';
    const trimmedCurrency = rateInfo.destinationCurrency?.trim() ?? '';

    payloadRecord[`ledger${ledgerIndex}`] = trimmedLedger;
    payloadRecord[`ledgerCurrency${ledgerIndex}`] = trimmedCurrency;

    if (rateInfo.ledger.trim()) {
      payloadRecord[`multiplyingRate${ledgerIndex}`] = rateInfo.rate ?? new Prisma.Decimal(1);
      payloadRecord[`dividingRate${ledgerIndex}`] = rateInfo.divisor ?? new Prisma.Decimal(1);
    }
  });

  let index = 0;

  for (const [taxCode, totals] of taxTotalsByCode.entries()) {
    if (index >= 20) break;

    const taxRecord = payload as Record<string, unknown>;
    const taxIndex = index + 1;

    taxRecord[`tax${taxIndex}`] = taxCode.trim();
    taxRecord[`taxBasis${taxIndex}`] = totals.totalAmountExcludingTax;
    taxRecord[`taxAmount${taxIndex}`] = totals.totalTaxAmount;
    taxRecord[`purchaseType${taxIndex}`] = LocalMenus.PurchaseOriginType.PURCHASE;

    index++;
  }

  payload.numberOfTaxes = index;

  const siteModel = context.companyInfo.siteModel as Record<string, string> | undefined;
  const analyticalLine = firstAnalyticalLine as Record<string, string> | undefined;

  for (let i = 1; i <= 10; i++) {
    const typeCode = siteModel?.[`dimensionType${i}`];
    const dimensionCode = siteModel?.[`dimension${i}`];
    const dimensionAnalyticalCode = analyticalLine?.[`dimension${i}`];

    if (typeCode) {
      const dimRecord = payload as Record<string, string>;
      dimRecord[`dimensionType${i}`] = typeCode;

      if (dimensionAnalyticalCode && dimensionAnalyticalCode !== dimensionCode) {
        dimRecord[`dimension${i}`] = dimensionAnalyticalCode;
      } else {
        dimRecord[`dimension${i}`] = dimensionCode ?? '';
      }
    }
  }

  return payload;
}

/** Builds the lines payload for the supplier invoice.
 *
 * Unlike JournalEntryLine (one row per ledger), SupplierInvoiceLines has no
 * ledger column in its unique key ([document, line]) - a single row carries
 * every applicable ledger via the account1..10/ledger1..10/planCode1..10
 * columns. `validateLines()` returns one context entry per (line x ledger)
 * combination, so entries are grouped back by line number here and folded
 * into a single row per group.
 *
 * @param context - The flattened (line x ledger) contexts returned by validateLines().
 * @param headerContext - The header context for the supplier invoice.
 * @returns An object containing the lines payload, the line groups (for analytics/open items) and business partner info.
 */
function buildLinesPayload(
  context: SupplierInvoiceLineContext[],
  headerContext: SupplierInvoiceHeaderContext,
): SupplierInvoiceLinesPayloadResult {
  const timestamps = getAuditTimestamps();
  const payload: Prisma.SupplierInvoiceLinesCreateManyInput[] = [];
  const lineGroups: SupplierInvoiceLineGroup[] = [];
  // const partnerInfo: OpenItemBusinessPartnerInfo = {};

  const groupedByLine = new Map<number, SupplierInvoiceLineContext[]>();

  for (const line of context) {
    const group = groupedByLine.get(line.lineNumber) ?? [];
    group.push(line);
    groupedByLine.set(line.lineNumber, group);
  }

  const taxTotalsByCode = new Map<string, SupplierInvoiceLineTotalAmount>();

  for (const [lineNumber, ledgerLines] of groupedByLine.entries()) {
    const headerUUID = generateUUIDBuffer().slice(0);
    const legalLine = ledgerLines.find((l) => l.ledgerType === LocalMenus.LedgerType.LEGAL) ?? ledgerLines[0];
    const taxCode = legalLine.taxCode?.trim() || '';

    const excludingTax = legalLine.amounts.currencyAmount ?? new Prisma.Decimal(0);
    const taxAmount = legalLine.amounts.taxAmount ?? new Prisma.Decimal(0);
    const includingTax = legalLine.amounts.currencyAmountIncludingTax ?? excludingTax;

    const currentTaxTotal = taxTotalsByCode.get(taxCode) ?? {
      totalAmountExcludingTax: new Prisma.Decimal(0),
      totalAmountIncludingTax: new Prisma.Decimal(0),
      totalTaxAmount: new Prisma.Decimal(0),
    };

    taxTotalsByCode.set(taxCode, {
      totalAmountExcludingTax: currentTaxTotal.totalAmountExcludingTax.plus(excludingTax),
      totalAmountIncludingTax: currentTaxTotal.totalAmountIncludingTax.plus(includingTax),
      totalTaxAmount: currentTaxTotal.totalTaxAmount.plus(taxAmount),
    });

    // Determine the business partner for the line
    // let businessPartner = '';
    // if (legalLine.collective?.trim() !== '') {
    //   for (const bpInfo of legalLine.businessPartner || []) {
    //     businessPartner = bpInfo.code || '';
    //     if (businessPartner) {
    //       partnerInfo.code = businessPartner;

    //       const isSupplier: LocalMenus.NoYes = bpInfo.isSupplier;

    //       if (isSupplier === LocalMenus.NoYes.YES && bpInfo.supplier) {
    //         partnerInfo.partnerType = LocalMenus.BusinessPartnerType.SUPPLIER;
    //         partnerInfo.payToOrPayBy = bpInfo.supplier.payToBusinessPartner;
    //         partnerInfo.partnerAddress = bpInfo.supplier.payToBusinessPartnerAddress;
    //       }
    //       partnerInfo.paymentMethod = bpInfo.paymentMethod || '';
    //       partnerInfo.paymentType = bpInfo.paymentType || 0;
    //       break;
    //     }
    //   }
    // }

    // Build the line payload
    const linePayload: Prisma.SupplierInvoiceLinesCreateManyInput = {
      invoiceCategory: headerContext.invoiceTypeIsValid?.invoiceCategory || 0,
      line: lineNumber,
      site: headerContext.site,
      company: headerContext.company,
      account1: ledgerLines[0].account?.trim() || '',
      ledger1: ledgerLines[0].ledger?.trim() || '',
      planCode1: ledgerLines[0].planCode?.trim() || '',
      // businessPartner: businessPartner.trim(),
      comment: legalLine.comment?.trim() || '',
      tax3: legalLine.taxCode?.trim() || '',
      lineAmountIncludingTax: includingTax,
      lineAmountExcludingTax: excludingTax,
      taxAmount: taxAmount,
      deductableTax: legalLine.deductableTax || new Prisma.Decimal(0),
      createDatetime: timestamps.dateTime,
      updateDatetime: timestamps.dateTime,
      singleID: headerUUID,
      ...(headerContext.isExcel && {
        createUser: headerContext.currentUser?.toUpperCase() || 'INTER',
        updateUser: headerContext.currentUser?.toUpperCase() || 'INTER',
      }),
    };

    // // Fold every ledger applicable to this line into the accountN/ledgerN/planCodeN columns
    // const payloadRecord = linePayload as Record<string, unknown>;
    // for (const ledgerLine of ledgerLines) {
    //   const slot = ledgerLine.ledgerType;
    //   payloadRecord[`account${slot}`] = ledgerLine.account?.trim() || '';
    //   payloadRecord[`ledger${slot}`] = ledgerLine.ledger?.trim() || '';
    //   payloadRecord[`planCode${slot}`] = ledgerLine.planCode?.trim() || '';

    //   // Only process one ledger/account/planCode
    //   break;
    // }

    payload.push(linePayload);
    lineGroups.push({
      line: linePayload,
      legalContext: legalLine,
      ledgerLine: { account: ledgerLines[0].account?.trim() || '', planCode: ledgerLines[0].planCode?.trim() || '' },
    });
  }

  // return { linesPayload: payload, lineGroups, partnerInfo, taxTotalsByCode };
  return { linesPayload: payload, lineGroups, taxTotalsByCode };
}

/** Builds the analytical lines payload for the supplier invoice.
 *
 * AnalyticalSupplierLine has the same no-relation, multi-ledger-in-one-row
 * shape as SupplierInvoiceLines (account1..10/planCode1..10, unique key
 * [document, line, analyticalLine]), so the same per-line grouping produced
 * by buildLinesPayload is reused here - one analytical row per invoice line.
 *
 * @param headerContext - The header context for the supplier invoice.
 * @param dimensionTypes - The dimension types defined in the supplier invoice context.
 * @param lineGroups - The line groups built by buildLinesPayload.
 * @returns An array of analytical line payloads for the supplier invoice.
 */
function buildAnalyticsPayload(
  headerContext: SupplierInvoiceHeaderContext,
  dimensionTypes: Map<string, DimensionTypeConfig>,
  lineGroups: SupplierInvoiceLineGroup[],
): Prisma.AnalyticalSupplierLineCreateManyInput[] {
  const timestamps = getAuditTimestamps();
  const payload: Prisma.AnalyticalSupplierLineCreateManyInput[] = [];

  for (const group of lineGroups) {
    const headerUUID = generateUUIDBuffer().slice(0);
    const { line: linePayload, legalContext, ledgerLine } = group;

    const analyticalLine: Prisma.AnalyticalSupplierLineCreateManyInput = {
      invoiceCategory: headerContext.invoiceTypeIsValid?.invoiceCategory || 0,
      line: linePayload.line,
      analyticalLine: 1,
      account1: ledgerLine.account?.trim() || '',
      planCode1: ledgerLine.planCode?.trim() || '',
      amount: legalContext.amounts.currencyAmount || new Prisma.Decimal(0),
      createDatetime: timestamps.dateTime,
      updateDatetime: timestamps.dateTime,
      singleID: headerUUID,
      ...(headerContext.isExcel && {
        createUser: headerContext.currentUser?.toUpperCase() || 'INTER',
        updateUser: headerContext.currentUser?.toUpperCase() || 'INTER',
      }),
    };

    const record = analyticalLine as Record<string, unknown>;
    // for (const ledgerLine of ledgerLines) {
    //   const slot = ledgerLine.ledgerType;
    //   record[`account${slot}`] = ledgerLine.account?.trim() || '';
    //   record[`planCode${slot}`] = ledgerLine.planCode?.trim() || '';
    // }

    const lineDimensions = legalContext.dimensions;

    if (lineDimensions) {
      for (const [field, type] of dimensionTypes.entries()) {
        const typeCode = type.code;
        const fieldNumber = type.fieldNumber;

        record[`dimensionType${fieldNumber}`] = typeCode;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = lineDimensions[field];

        if (value !== undefined && value !== null) {
          record[`dimension${fieldNumber}`] = value;
        }
      }
    }

    payload.push(analyticalLine);
  }

  return payload;
}

/** Builds the open item payloads for the supplier invoice.
 *
 * Only one OpenItem is created per qualifying line (legal ledger, with a
 * business partner and a control account), same as the journal entry
 * pattern. `businessPartnerInfo` is a single object shared across all lines
 * (last line with a business partner wins), matching the existing journal
 * entry behavior this was adapted from.
 *
 * @param commonService Common service functions.
 * @param header - The header context for the supplier invoice.
 * @param lineGroups - The line groups built by buildLinesPayload.
 * @param businessPartnerInfo - The business partner information for the invoice.
 * @param documentType - The document type information for the invoice.
 * @returns An array of open item payloads for the supplier invoice.
 */
async function buildOpenItemPayload(
  commonService: CommonService,
  header: Prisma.SupplierInvoiceHeaderCreateInput,
  lineGroups: SupplierInvoiceLineGroup[],
  businessPartnerInfo: SupplierInvoiceBusinessPartnerInfo | undefined,
  documentType: DocumentTypes,
): Promise<Prisma.OpenItemCreateInput[]> {
  const timestamps = getAuditTimestamps();
  const openItems: Prisma.OpenItemCreateInput[] = [];

  // ORIGINAL IMPLEMENTATION (one OpenItem per qualifying line) - commented out to allow rollback.
  // To revert: uncomment this block and remove the "NEW IMPLEMENTATION" block below.
  // for (const group of lineGroups) {
  //   const { line, legalContext } = group;
  //
  //   if (
  //     legalContext.ledgerType !== LocalMenus.LedgerType.LEGAL ||
  //     !header.billBySupplier ||
  //     header.billBySupplier.trim() === '' ||
  //     !header.collective ||
  //     header.collective.trim() === ''
  //   ) {
  //     continue;
  //   }
  //
  //   const headerUUID = generateUUIDBuffer().slice(0);
  //   const uniqueNumber = `${header.internalNumber}/${line.line}`;
  //   const sign = header?.debitOrCredit ?? 1;
  //
  //   openItems.push({
  //     documentType: documentType?.documentType || '',
  //     lineNumber: line.line,
  //     openItemLineNumber: line.line,
  //     company: line.company,
  //     site: line.site,
  //     currency: header.currency,
  //     controlAccount: header.collective,
  //     businessPartner: header.billBySupplier || '',
  //     businessPartnerType: LocalMenus.BusinessPartnerType.SUPPLIER,
  //     payToOrPayByBusinessPartner: header.payToBusinessPartner || '',
  //     businessPartnerAddress: header.payToBusinessPartnerAddress || '',
  //     dueDate: header.accountingDate || new Date(),
  //     paymentMethod: businessPartnerInfo?.paymentMethod || '',
  //     paymentType: businessPartnerInfo?.paymentType || LocalMenus.DueDateType.TERMS,
  //     sign: sign * -1,
  //     amountInCurrency: line.lineAmountIncludingTax || new Prisma.Decimal(0),
  //     amountInCompanyCurrency: line.lineAmountIncludingTax || new Prisma.Decimal(0),
  //     canBeReminded: 0,
  //     paymentApprovalLevel: LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
  //     closedStatus: 1,
  //     fiscalYear: header.fiscalYear || 0,
  //     period: header.period || 0,
  //     typeOfOpenItem: documentType?.openItemType || 0,
  //     uniqueNumber: uniqueNumber,
  //     journalEntryLineInternalNumber: header.internalNumber || 0,
  //     createDate: timestamps.date,
  //     createUser: header.createUser,
  //     updateUser: header.updateUser,
  //     createDatetime: timestamps.dateTime,
  //     updateDatetime: timestamps.dateTime,
  //     singleID: headerUUID,
  //   });
  // }
  //
  // return openItems;

  // NEW IMPLEMENTATION: sum all qualifying lines into a single OpenItem instead of one per line.
  const qualifyingGroups = lineGroups.filter(
    (group) =>
      group.legalContext.ledgerType === LocalMenus.LedgerType.LEGAL &&
      !!header.billBySupplier &&
      header.billBySupplier.trim() !== '' &&
      !!header.collective &&
      header.collective.trim() !== '',
  );

  if (qualifyingGroups.length === 0) {
    return openItems;
  }

  const totalAmount = qualifyingGroups.reduce(
    (total, group) =>
      total.plus(new Prisma.Decimal((group.line.lineAmountIncludingTax ?? 0) as string | number | Prisma.Decimal)),
    new Prisma.Decimal(0),
  );

  const firstLine = qualifyingGroups[0].line;
  const headerUUID = generateUUIDBuffer().slice(0);
  const uniqueNumber = `${header.internalNumber}/${firstLine.line}`;
  const sign = header?.debitOrCredit ?? 1;

  let dueDate = header.accountingDate || new Date();

  if (header.paymentTerm) {
    const calculationStartDate = new Date(header.dueDateCalculationStartDate ?? dueDate);

    dueDate = await commonService.calculateDueDate(header.paymentTerm, calculationStartDate, documentType.legislation);
  }

  openItems.push({
    documentType: documentType?.documentType || '',
    lineNumber: firstLine.line,
    openItemLineNumber: firstLine.line,
    company: firstLine.company,
    site: firstLine.site,
    currency: header.currency,
    controlAccount: header.collective,
    businessPartner: header.billBySupplier || '',
    businessPartnerType: LocalMenus.BusinessPartnerType.SUPPLIER,
    payToOrPayByBusinessPartner: header.payToBusinessPartner || '',
    businessPartnerAddress: header.payToBusinessPartnerAddress || '',
    dueDate: dueDate,
    paymentMethod: businessPartnerInfo?.paymentMethod || '',
    paymentType: businessPartnerInfo?.paymentType || LocalMenus.DueDateType.TERMS,
    sign: sign * -1,
    amountInCurrency: totalAmount,
    amountInCompanyCurrency: totalAmount,
    canBeReminded: 0,
    paymentApprovalLevel: header.paymentApproval ?? LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
    closedStatus: 1,
    fiscalYear: header.fiscalYear || 0,
    period: header.period || 0,
    typeOfOpenItem: documentType?.openItemType || 0,
    uniqueNumber: uniqueNumber,
    journalEntryLineInternalNumber: header.internalNumber || 0,
    createDate: timestamps.date,
    createUser: header.createUser,
    updateUser: header.updateUser,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  });

  return openItems;
}
