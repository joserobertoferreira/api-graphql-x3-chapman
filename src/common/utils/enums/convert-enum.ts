import {
  AccountingJournalStatusGQL,
  ExchangeRateTypeGQL,
  LedgerTypeGQL,
  PaymentApprovalTypeGQL,
  PurchaseInvoiceStatusGQL,
  PurchaseInvoiceTypeGQL,
  PurchaseOriginTypeGQL,
  SignByDefaultGQL,
} from '../../registers/enum-register';
import { LocalMenus } from './local-menu';

export const ExchangeRateTypeToExchangeRateTypeGQL: Record<LocalMenus.ExchangeRateType, ExchangeRateTypeGQL> = {
  [LocalMenus.ExchangeRateType.DAILY_RATE]: ExchangeRateTypeGQL.dailyRate,
  [LocalMenus.ExchangeRateType.MONTHLY_RATE]: ExchangeRateTypeGQL.monthlyRate,
  [LocalMenus.ExchangeRateType.AVERAGE_RATE]: ExchangeRateTypeGQL.averageRate,
  [LocalMenus.ExchangeRateType.CUSTOMS_DOC_FILE_EXCHANGE]: ExchangeRateTypeGQL.customsDocFileExchange,
};

export const ExchangeRateTypeGQLToExchangeRateType: Record<ExchangeRateTypeGQL, LocalMenus.ExchangeRateType> = {
  [ExchangeRateTypeGQL.dailyRate]: LocalMenus.ExchangeRateType.DAILY_RATE,
  [ExchangeRateTypeGQL.monthlyRate]: LocalMenus.ExchangeRateType.MONTHLY_RATE,
  [ExchangeRateTypeGQL.averageRate]: LocalMenus.ExchangeRateType.AVERAGE_RATE,
  [ExchangeRateTypeGQL.customsDocFileExchange]: LocalMenus.ExchangeRateType.CUSTOMS_DOC_FILE_EXCHANGE,
};

export const LedgerTypeToLedgerTypeGQL: Record<LocalMenus.LedgerType, LedgerTypeGQL> = {
  [LocalMenus.LedgerType.LEGAL]: LedgerTypeGQL.legal,
  [LocalMenus.LedgerType.ANALYTICAL]: LedgerTypeGQL.analytical,
  [LocalMenus.LedgerType.IAS]: LedgerTypeGQL.ias,
  [LocalMenus.LedgerType.CF_CONSOLIDATION_GBP]: LedgerTypeGQL.cfConsolidationGBP,
  [LocalMenus.LedgerType.CF_CONSOLIDATION_USD]: LedgerTypeGQL.cfConsolidationUSD,
  [LocalMenus.LedgerType.CF_CONSOLIDATION_LEDGER]: LedgerTypeGQL.cfConsolidationLedger,
  [LocalMenus.LedgerType.NOT_USED_7]: LedgerTypeGQL.notUsed7,
  [LocalMenus.LedgerType.NOT_USED_8]: LedgerTypeGQL.notUsed8,
  [LocalMenus.LedgerType.NOT_USED_9]: LedgerTypeGQL.notUsed9,
  [LocalMenus.LedgerType.NOT_USED_10]: LedgerTypeGQL.notUsed10,
};

export const LedgerTypeGQLToLedgerType: Record<LedgerTypeGQL, LocalMenus.LedgerType> = {
  [LedgerTypeGQL.legal]: LocalMenus.LedgerType.LEGAL,
  [LedgerTypeGQL.analytical]: LocalMenus.LedgerType.ANALYTICAL,
  [LedgerTypeGQL.ias]: LocalMenus.LedgerType.IAS,
  [LedgerTypeGQL.cfConsolidationGBP]: LocalMenus.LedgerType.CF_CONSOLIDATION_GBP,
  [LedgerTypeGQL.cfConsolidationUSD]: LocalMenus.LedgerType.CF_CONSOLIDATION_USD,
  [LedgerTypeGQL.cfConsolidationLedger]: LocalMenus.LedgerType.CF_CONSOLIDATION_LEDGER,
  [LedgerTypeGQL.notUsed7]: LocalMenus.LedgerType.NOT_USED_7,
  [LedgerTypeGQL.notUsed8]: LocalMenus.LedgerType.NOT_USED_8,
  [LedgerTypeGQL.notUsed9]: LocalMenus.LedgerType.NOT_USED_9,
  [LedgerTypeGQL.notUsed10]: LocalMenus.LedgerType.NOT_USED_10,
};

export const SignByDefaultToSignByDefaultGQL: Record<LocalMenus.SignByDefault, SignByDefaultGQL> = {
  [LocalMenus.SignByDefault.DEBIT]: SignByDefaultGQL.debit,
  [LocalMenus.SignByDefault.CREDIT]: SignByDefaultGQL.credit,
  [LocalMenus.SignByDefault.UNSPECIFIED]: SignByDefaultGQL.unspecified,
};

export const SignByDefaultGQLToSignByDefault: Record<SignByDefaultGQL, LocalMenus.SignByDefault> = {
  [SignByDefaultGQL.debit]: LocalMenus.SignByDefault.DEBIT,
  [SignByDefaultGQL.credit]: LocalMenus.SignByDefault.CREDIT,
  [SignByDefaultGQL.unspecified]: LocalMenus.SignByDefault.UNSPECIFIED,
};

export const AccountingJournalStatusToAccountingJournalStatusGQL: Record<
  LocalMenus.AccountingJournalStatus,
  AccountingJournalStatusGQL
> = {
  [LocalMenus.AccountingJournalStatus.TEMPORARY]: AccountingJournalStatusGQL.temporary,
  [LocalMenus.AccountingJournalStatus.FINAL]: AccountingJournalStatusGQL.final,
};

export const AccountingJournalStatusGQLToAccountingJournalStatus: Record<
  AccountingJournalStatusGQL,
  LocalMenus.AccountingJournalStatus
> = {
  [AccountingJournalStatusGQL.temporary]: LocalMenus.AccountingJournalStatus.TEMPORARY,
  [AccountingJournalStatusGQL.final]: LocalMenus.AccountingJournalStatus.FINAL,
};

export const PaymentApprovalTypeToPaymentApprovalTypeGQL: Record<
  LocalMenus.PaymentApprovalType,
  PaymentApprovalTypeGQL
> = {
  [LocalMenus.PaymentApprovalType.NOT_APPROVED]: PaymentApprovalTypeGQL.notApproved,
  [LocalMenus.PaymentApprovalType.CONFLICT]: PaymentApprovalTypeGQL.conflict,
  [LocalMenus.PaymentApprovalType.DELAYED]: PaymentApprovalTypeGQL.delayed,
  [LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY]: PaymentApprovalTypeGQL.authorizedToPay,
};

export const PaymentApprovalTypeGQLToPaymentApprovalType: Record<
  PaymentApprovalTypeGQL,
  LocalMenus.PaymentApprovalType
> = {
  [PaymentApprovalTypeGQL.notApproved]: LocalMenus.PaymentApprovalType.NOT_APPROVED,
  [PaymentApprovalTypeGQL.conflict]: LocalMenus.PaymentApprovalType.CONFLICT,
  [PaymentApprovalTypeGQL.delayed]: LocalMenus.PaymentApprovalType.DELAYED,
  [PaymentApprovalTypeGQL.authorizedToPay]: LocalMenus.PaymentApprovalType.AUTHORIZED_TO_PAY,
};

export const PurchaseInvoiceTypeToPurchaseInvoiceTypeGQL: Record<
  LocalMenus.PurchaseInvoiceType,
  PurchaseInvoiceTypeGQL
> = {
  [LocalMenus.PurchaseInvoiceType.INVOICE]: PurchaseInvoiceTypeGQL.invoice,
  [LocalMenus.PurchaseInvoiceType.COMPLEMENT_INVOICE]: PurchaseInvoiceTypeGQL.complementInvoice,
  [LocalMenus.PurchaseInvoiceType.CREDIT_NOTE]: PurchaseInvoiceTypeGQL.creditNote,
  [LocalMenus.PurchaseInvoiceType.CREDIT_NOTE_RETURN]: PurchaseInvoiceTypeGQL.creditNoteReturn,
};

export const PurchaseInvoiceTypeGQLToPurchaseInvoiceType: Record<
  PurchaseInvoiceTypeGQL,
  LocalMenus.PurchaseInvoiceType
> = {
  [PurchaseInvoiceTypeGQL.invoice]: LocalMenus.PurchaseInvoiceType.INVOICE,
  [PurchaseInvoiceTypeGQL.complementInvoice]: LocalMenus.PurchaseInvoiceType.COMPLEMENT_INVOICE,
  [PurchaseInvoiceTypeGQL.creditNote]: LocalMenus.PurchaseInvoiceType.CREDIT_NOTE,
  [PurchaseInvoiceTypeGQL.creditNoteReturn]: LocalMenus.PurchaseInvoiceType.CREDIT_NOTE_RETURN,
};

export const PurchaseOriginTypeToPurchaseOriginTypeTypeGQL: Record<
  LocalMenus.PurchaseOriginType,
  PurchaseOriginTypeGQL
> = {
  [LocalMenus.PurchaseOriginType.PURCHASE]: PurchaseOriginTypeGQL.purchase,
  [LocalMenus.PurchaseOriginType.FIXED_ASSET]: PurchaseOriginTypeGQL.fixedAsset,
  [LocalMenus.PurchaseOriginType.SERVICES]: PurchaseOriginTypeGQL.services,
};

export const PurchaseOriginTypeGQLToPurchaseOriginType: Record<PurchaseOriginTypeGQL, LocalMenus.PurchaseOriginType> = {
  [PurchaseOriginTypeGQL.purchase]: LocalMenus.PurchaseOriginType.PURCHASE,
  [PurchaseOriginTypeGQL.fixedAsset]: LocalMenus.PurchaseOriginType.FIXED_ASSET,
  [PurchaseOriginTypeGQL.services]: LocalMenus.PurchaseOriginType.SERVICES,
};

export const PurchaseInvoiceStatusToPurchaseInvoiceStatusGQL: Record<
  LocalMenus.PurchaseInvoiceStatus,
  PurchaseInvoiceStatusGQL
> = {
  [LocalMenus.PurchaseInvoiceStatus.SUSPENDED]: PurchaseInvoiceStatusGQL.suspended,
  [LocalMenus.PurchaseInvoiceStatus.TO_CONFIRM]: PurchaseInvoiceStatusGQL.toConfirm,
  [LocalMenus.PurchaseInvoiceStatus.VALIDATED]: PurchaseInvoiceStatusGQL.validated,
};

export const PurchaseInvoiceStatusGQLToPurchaseInvoiceStatus: Record<
  PurchaseInvoiceStatusGQL,
  LocalMenus.PurchaseInvoiceStatus
> = {
  [PurchaseInvoiceStatusGQL.suspended]: LocalMenus.PurchaseInvoiceStatus.SUSPENDED,
  [PurchaseInvoiceStatusGQL.toConfirm]: LocalMenus.PurchaseInvoiceStatus.TO_CONFIRM,
  [PurchaseInvoiceStatusGQL.validated]: LocalMenus.PurchaseInvoiceStatus.VALIDATED,
};
