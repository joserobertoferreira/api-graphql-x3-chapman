import { JournalEntryLineContext } from '../../../common/types/journal-entry.types';
import { OpenItemContext } from '../../../common/types/opem-item.types';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';

/**
 * Build the context for opening items in journal entries.
 */
export function buildJournalEntryOpenItemContext(
  lines: JournalEntryLineContext[] | null,
  input: CreateJournalEntryInput,
): OpenItemContext[] {
  if (!lines || lines.length === 0) {
    return [];
  }

  // Filter the lines where the ledger type is equal to LEGAL
  const legalLines = lines.filter((line) => line.ledgerType === LocalMenus.LedgerType.LEGAL);

  const openItems: OpenItemContext[] = [];

  for (const line of legalLines) {
    // Check if the line has a business partner
    for (const bpInfo of line.businessPartner || []) {
      let partnerType = 0;
      let partnerAddress = '';
      let payToOrPayBy = '';
      let sign = 0;

      // Determine the business partner type and related details
      if (bpInfo.customer && bpInfo.isCustomer === LocalMenus.NoYes.YES) {
        partnerType = LocalMenus.BusinessPartnerType.CUSTOMER;
        payToOrPayBy = bpInfo.customer.payByCustomer;
        partnerAddress = bpInfo.customer.payByCustomerAddress;
      } else if (bpInfo.isSupplier === LocalMenus.NoYes.YES && bpInfo.supplier) {
        partnerType = LocalMenus.BusinessPartnerType.SUPPLIER;
        payToOrPayBy = bpInfo.supplier.payToBusinessPartner;
        partnerAddress = bpInfo.supplier.payToBusinessPartnerAddress;
      }
      const paymentMethod = bpInfo.paymentMethod || '';

      // Determine the sign based on debit or credit
      if (line.debit && line.debit > 0) {
        sign = 1;
      } else if (line.credit && line.credit > 0) {
        sign = -1;
      }

      // Add the open item context to the list
      openItems.push({
        documentType: input.documentType,
        lineNumber: line.lineNumber,
        openItemLineNumber: line.lineNumber,
        company: input.company,
        site: input.site,
        currency: input.sourceCurrency,
        controlAccount: line.collective,
        businessPartner: bpInfo.code,
        businessPartnerType: partnerType,
        payToOrPayByBusinessPartner: payToOrPayBy,
        businessPartnerAddress: partnerAddress,
        dueDate: input.accountingDate || new Date(),
        paymentMethod: paymentMethod,
        paymentType: LocalMenus.DueDateType.TERMS,
        sign: sign,
        amountInCurrency: line.amounts.currencyAmount || 0,
        amountInCompanyCurrency: line.amounts.ledgerAmount || 0,
        canBeReminded: LocalMenus.NoYes.YES,
        paymentApprovalLevel: LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
        postedStatus: 2,
        closedStatus: 1,
        fiscalYear: line.fiscalYear,
        period: line.period,
      });
    }
  }

  return openItems;
}
