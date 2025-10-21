"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalMenus = void 0;
var LocalMenus;
(function (LocalMenus) {
    let NoYes;
    (function (NoYes) {
        NoYes[NoYes["NO"] = 1] = "NO";
        NoYes[NoYes["YES"] = 2] = "YES";
    })(NoYes = LocalMenus.NoYes || (LocalMenus.NoYes = {}));
    let EntryMode;
    (function (EntryMode) {
        EntryMode[EntryMode["ENTERED"] = 1] = "ENTERED";
        EntryMode[EntryMode["DISPLAYED"] = 2] = "DISPLAYED";
        EntryMode[EntryMode["HIDDEN"] = 3] = "HIDDEN";
    })(EntryMode = LocalMenus.EntryMode || (LocalMenus.EntryMode = {}));
    let DefinitionLevel;
    (function (DefinitionLevel) {
        DefinitionLevel[DefinitionLevel["FOLDER"] = 1] = "FOLDER";
        DefinitionLevel[DefinitionLevel["COMPANY"] = 2] = "COMPANY";
        DefinitionLevel[DefinitionLevel["SITE"] = 3] = "SITE";
    })(DefinitionLevel = LocalMenus.DefinitionLevel || (LocalMenus.DefinitionLevel = {}));
    let SequenceNumberType;
    (function (SequenceNumberType) {
        SequenceNumberType[SequenceNumberType["ALPHANUMERIC"] = 1] = "ALPHANUMERIC";
        SequenceNumberType[SequenceNumberType["NUMERIC"] = 2] = "NUMERIC";
    })(SequenceNumberType = LocalMenus.SequenceNumberType || (LocalMenus.SequenceNumberType = {}));
    let SequenceNumberFields;
    (function (SequenceNumberFields) {
        SequenceNumberFields[SequenceNumberFields["CONSTANT"] = 1] = "CONSTANT";
        SequenceNumberFields[SequenceNumberFields["YEAR"] = 2] = "YEAR";
        SequenceNumberFields[SequenceNumberFields["MONTH"] = 3] = "MONTH";
        SequenceNumberFields[SequenceNumberFields["WEEK"] = 4] = "WEEK";
        SequenceNumberFields[SequenceNumberFields["DAY"] = 5] = "DAY";
        SequenceNumberFields[SequenceNumberFields["COMPANY"] = 6] = "COMPANY";
        SequenceNumberFields[SequenceNumberFields["SITE"] = 7] = "SITE";
        SequenceNumberFields[SequenceNumberFields["SEQUENCE_NUMBER"] = 8] = "SEQUENCE_NUMBER";
        SequenceNumberFields[SequenceNumberFields["COMPLEMENT"] = 9] = "COMPLEMENT";
        SequenceNumberFields[SequenceNumberFields["FISCAL_YEAR"] = 10] = "FISCAL_YEAR";
        SequenceNumberFields[SequenceNumberFields["PERIOD"] = 11] = "PERIOD";
        SequenceNumberFields[SequenceNumberFields["FORMULA"] = 12] = "FORMULA";
    })(SequenceNumberFields = LocalMenus.SequenceNumberFields || (LocalMenus.SequenceNumberFields = {}));
    let ResetSequenceNumberToZero;
    (function (ResetSequenceNumberToZero) {
        ResetSequenceNumberToZero[ResetSequenceNumberToZero["NO_RTZ"] = 1] = "NO_RTZ";
        ResetSequenceNumberToZero[ResetSequenceNumberToZero["ANNUAL"] = 2] = "ANNUAL";
        ResetSequenceNumberToZero[ResetSequenceNumberToZero["MONTHLY"] = 3] = "MONTHLY";
        ResetSequenceNumberToZero[ResetSequenceNumberToZero["FISCAL_YEAR"] = 4] = "FISCAL_YEAR";
        ResetSequenceNumberToZero[ResetSequenceNumberToZero["PERIOD"] = 5] = "PERIOD";
    })(ResetSequenceNumberToZero = LocalMenus.ResetSequenceNumberToZero || (LocalMenus.ResetSequenceNumberToZero = {}));
    let ExchangeRateType;
    (function (ExchangeRateType) {
        ExchangeRateType[ExchangeRateType["DAILY_RATE"] = 1] = "DAILY_RATE";
        ExchangeRateType[ExchangeRateType["MONTHLY_RATE"] = 2] = "MONTHLY_RATE";
        ExchangeRateType[ExchangeRateType["AVERAGE_RATE"] = 3] = "AVERAGE_RATE";
        ExchangeRateType[ExchangeRateType["CUSTOMS_DOC_FILE_EXCHANGE"] = 4] = "CUSTOMS_DOC_FILE_EXCHANGE";
    })(ExchangeRateType = LocalMenus.ExchangeRateType || (LocalMenus.ExchangeRateType = {}));
    let FiscalYearPeriodStatus;
    (function (FiscalYearPeriodStatus) {
        FiscalYearPeriodStatus[FiscalYearPeriodStatus["NOT_OPEN"] = 1] = "NOT_OPEN";
        FiscalYearPeriodStatus[FiscalYearPeriodStatus["OPEN"] = 2] = "OPEN";
        FiscalYearPeriodStatus[FiscalYearPeriodStatus["CLOSED"] = 3] = "CLOSED";
    })(FiscalYearPeriodStatus = LocalMenus.FiscalYearPeriodStatus || (LocalMenus.FiscalYearPeriodStatus = {}));
    let ProductCreationMode;
    (function (ProductCreationMode) {
        ProductCreationMode[ProductCreationMode["DIRECT"] = 1] = "DIRECT";
        ProductCreationMode[ProductCreationMode["WITH_VALIDATION"] = 2] = "WITH_VALIDATION";
    })(ProductCreationMode = LocalMenus.ProductCreationMode || (LocalMenus.ProductCreationMode = {}));
    let PriceWithWithoutTax;
    (function (PriceWithWithoutTax) {
        PriceWithWithoutTax[PriceWithWithoutTax["PRICE_EXCLUDING_TAX"] = 1] = "PRICE_EXCLUDING_TAX";
        PriceWithWithoutTax[PriceWithWithoutTax["PRICE_INCLUDING_TAX"] = 2] = "PRICE_INCLUDING_TAX";
    })(PriceWithWithoutTax = LocalMenus.PriceWithWithoutTax || (LocalMenus.PriceWithWithoutTax = {}));
    let LineStatus;
    (function (LineStatus) {
        LineStatus[LineStatus["PENDING"] = 1] = "PENDING";
        LineStatus[LineStatus["LATE"] = 2] = "LATE";
        LineStatus[LineStatus["CLOSED"] = 3] = "CLOSED";
    })(LineStatus = LocalMenus.LineStatus || (LocalMenus.LineStatus = {}));
    let DueDateType;
    (function (DueDateType) {
        DueDateType[DueDateType["TERMS"] = 1] = "TERMS";
        DueDateType[DueDateType["DEPOSIT"] = 2] = "DEPOSIT";
        DueDateType[DueDateType["RETENTION_GUARANTEE"] = 3] = "RETENTION_GUARANTEE";
    })(DueDateType = LocalMenus.DueDateType || (LocalMenus.DueDateType = {}));
    let OrderCategory;
    (function (OrderCategory) {
        OrderCategory[OrderCategory["NORMAL"] = 1] = "NORMAL";
        OrderCategory[OrderCategory["LOAN"] = 2] = "LOAN";
        OrderCategory[OrderCategory["DIRECT_INVOICING"] = 3] = "DIRECT_INVOICING";
        OrderCategory[OrderCategory["CONTRACT_ORDER"] = 4] = "CONTRACT_ORDER";
    })(OrderCategory = LocalMenus.OrderCategory || (LocalMenus.OrderCategory = {}));
    let OrderStatus;
    (function (OrderStatus) {
        OrderStatus[OrderStatus["OPEN"] = 1] = "OPEN";
        OrderStatus[OrderStatus["CLOSED"] = 2] = "CLOSED";
    })(OrderStatus = LocalMenus.OrderStatus || (LocalMenus.OrderStatus = {}));
    let InvoiceStatus;
    (function (InvoiceStatus) {
        InvoiceStatus[InvoiceStatus["NOT_INVOICED"] = 1] = "NOT_INVOICED";
        InvoiceStatus[InvoiceStatus["PARTLY_INVOICED"] = 2] = "PARTLY_INVOICED";
        InvoiceStatus[InvoiceStatus["INVOICED"] = 3] = "INVOICED";
    })(InvoiceStatus = LocalMenus.InvoiceStatus || (LocalMenus.InvoiceStatus = {}));
    let OrderType;
    (function (OrderType) {
        OrderType[OrderType["ORDER"] = 1] = "ORDER";
        OrderType[OrderType["CONTRACT_ORDER"] = 2] = "CONTRACT_ORDER";
    })(OrderType = LocalMenus.OrderType || (LocalMenus.OrderType = {}));
    let PurchaseType;
    (function (PurchaseType) {
        PurchaseType[PurchaseType["COMMERCIAL"] = 1] = "COMMERCIAL";
        PurchaseType[PurchaseType["GENERAL"] = 2] = "GENERAL";
    })(PurchaseType = LocalMenus.PurchaseType || (LocalMenus.PurchaseType = {}));
    let PaymentApprovalType;
    (function (PaymentApprovalType) {
        PaymentApprovalType[PaymentApprovalType["NOT_APPROVED"] = 1] = "NOT_APPROVED";
        PaymentApprovalType[PaymentApprovalType["CONFLICT"] = 2] = "CONFLICT";
        PaymentApprovalType[PaymentApprovalType["DELAYED"] = 3] = "DELAYED";
        PaymentApprovalType[PaymentApprovalType["AUTHORIZED_TO_PAY"] = 4] = "AUTHORIZED_TO_PAY";
    })(PaymentApprovalType = LocalMenus.PaymentApprovalType || (LocalMenus.PaymentApprovalType = {}));
    let PurchaseInvoiceType;
    (function (PurchaseInvoiceType) {
        PurchaseInvoiceType[PurchaseInvoiceType["INVOICE"] = 1] = "INVOICE";
        PurchaseInvoiceType[PurchaseInvoiceType["COMPLEMENT_INVOICE"] = 2] = "COMPLEMENT_INVOICE";
        PurchaseInvoiceType[PurchaseInvoiceType["CREDIT_NOTE"] = 3] = "CREDIT_NOTE";
        PurchaseInvoiceType[PurchaseInvoiceType["CREDIT_NOTE_RETURN"] = 4] = "CREDIT_NOTE_RETURN";
    })(PurchaseInvoiceType = LocalMenus.PurchaseInvoiceType || (LocalMenus.PurchaseInvoiceType = {}));
    let TaxManagement;
    (function (TaxManagement) {
        TaxManagement[TaxManagement["NOT_SUBJECTED"] = 1] = "NOT_SUBJECTED";
        TaxManagement[TaxManagement["SUBJECTED"] = 2] = "SUBJECTED";
        TaxManagement[TaxManagement["TAX_ACCOUNT"] = 3] = "TAX_ACCOUNT";
        TaxManagement[TaxManagement["EEC_TAX"] = 4] = "EEC_TAX";
        TaxManagement[TaxManagement["DOWN_PAYMENT_ACCOUNT"] = 5] = "DOWN_PAYMENT_ACCOUNT";
    })(TaxManagement = LocalMenus.TaxManagement || (LocalMenus.TaxManagement = {}));
    let SignByDefault;
    (function (SignByDefault) {
        SignByDefault[SignByDefault["DEBIT"] = 1] = "DEBIT";
        SignByDefault[SignByDefault["CREDIT"] = 2] = "CREDIT";
        SignByDefault[SignByDefault["UNSPECIFIED"] = 3] = "UNSPECIFIED";
    })(SignByDefault = LocalMenus.SignByDefault || (LocalMenus.SignByDefault = {}));
    let AccountingJournalStatus;
    (function (AccountingJournalStatus) {
        AccountingJournalStatus[AccountingJournalStatus["TEMPORARY"] = 1] = "TEMPORARY";
        AccountingJournalStatus[AccountingJournalStatus["FINAL"] = 2] = "FINAL";
    })(AccountingJournalStatus = LocalMenus.AccountingJournalStatus || (LocalMenus.AccountingJournalStatus = {}));
    let AccountingJournalCategory;
    (function (AccountingJournalCategory) {
        AccountingJournalCategory[AccountingJournalCategory["ACTUAL"] = 1] = "ACTUAL";
        AccountingJournalCategory[AccountingJournalCategory["ACTIVE_SIMULATION"] = 2] = "ACTIVE_SIMULATION";
        AccountingJournalCategory[AccountingJournalCategory["INACTIVE_SIMULATION"] = 3] = "INACTIVE_SIMULATION";
        AccountingJournalCategory[AccountingJournalCategory["EXCEPTIONAL"] = 4] = "EXCEPTIONAL";
        AccountingJournalCategory[AccountingJournalCategory["TEMPLATE"] = 5] = "TEMPLATE";
    })(AccountingJournalCategory = LocalMenus.AccountingJournalCategory || (LocalMenus.AccountingJournalCategory = {}));
    let BusinessPartnerType;
    (function (BusinessPartnerType) {
        BusinessPartnerType[BusinessPartnerType["CUSTOMER"] = 1] = "CUSTOMER";
        BusinessPartnerType[BusinessPartnerType["SUPPLIER"] = 2] = "SUPPLIER";
    })(BusinessPartnerType = LocalMenus.BusinessPartnerType || (LocalMenus.BusinessPartnerType = {}));
    let InvoiceType;
    (function (InvoiceType) {
        InvoiceType[InvoiceType["INVOICE"] = 1] = "INVOICE";
        InvoiceType[InvoiceType["CREDIT_NOTE"] = 2] = "CREDIT_NOTE";
        InvoiceType[InvoiceType["DEBIT_NOTE"] = 3] = "DEBIT_NOTE";
        InvoiceType[InvoiceType["CREDIT_MEMO"] = 4] = "CREDIT_MEMO";
        InvoiceType[InvoiceType["PROFORMA"] = 5] = "PROFORMA";
    })(InvoiceType = LocalMenus.InvoiceType || (LocalMenus.InvoiceType = {}));
    let RateDate;
    (function (RateDate) {
        RateDate[RateDate["JOURNAL_ENTRY_DATE"] = 1] = "JOURNAL_ENTRY_DATE";
        RateDate[RateDate["SOURCE_DOCUMENT_DATE"] = 2] = "SOURCE_DOCUMENT_DATE";
    })(RateDate = LocalMenus.RateDate || (LocalMenus.RateDate = {}));
    let EntityType;
    (function (EntityType) {
        EntityType[EntityType["BUSINESS_PARTNER"] = 1] = "BUSINESS_PARTNER";
        EntityType[EntityType["COMPANY"] = 2] = "COMPANY";
        EntityType[EntityType["SITE"] = 3] = "SITE";
        EntityType[EntityType["USER"] = 4] = "USER";
        EntityType[EntityType["ACCOUNTS"] = 5] = "ACCOUNTS";
        EntityType[EntityType["LEADS"] = 6] = "LEADS";
        EntityType[EntityType["BUILDING"] = 7] = "BUILDING";
        EntityType[EntityType["PLACE"] = 8] = "PLACE";
    })(EntityType = LocalMenus.EntityType || (LocalMenus.EntityType = {}));
    let InvoiceAccountingStatus;
    (function (InvoiceAccountingStatus) {
        InvoiceAccountingStatus[InvoiceAccountingStatus["NOT_POSTED"] = 1] = "NOT_POSTED";
        InvoiceAccountingStatus[InvoiceAccountingStatus["NOT_USED"] = 2] = "NOT_USED";
        InvoiceAccountingStatus[InvoiceAccountingStatus["POSTED"] = 3] = "POSTED";
    })(InvoiceAccountingStatus = LocalMenus.InvoiceAccountingStatus || (LocalMenus.InvoiceAccountingStatus = {}));
    let DueDateItemType;
    (function (DueDateItemType) {
        DueDateItemType[DueDateItemType["ORDER"] = 1] = "ORDER";
        DueDateItemType[DueDateItemType["INVOICE"] = 2] = "INVOICE";
        DueDateItemType[DueDateItemType["PAYMENT"] = 3] = "PAYMENT";
        DueDateItemType[DueDateItemType["OTHERS"] = 4] = "OTHERS";
    })(DueDateItemType = LocalMenus.DueDateItemType || (LocalMenus.DueDateItemType = {}));
    let FiscalYearReport;
    (function (FiscalYearReport) {
        FiscalYearReport[FiscalYearReport["NOT_OPEN"] = 1] = "NOT_OPEN";
        FiscalYearReport[FiscalYearReport["OPEN"] = 2] = "OPEN";
        FiscalYearReport[FiscalYearReport["CLOSED"] = 3] = "CLOSED";
    })(FiscalYearReport = LocalMenus.FiscalYearReport || (LocalMenus.FiscalYearReport = {}));
    let LedgerType;
    (function (LedgerType) {
        LedgerType[LedgerType["LEGAL"] = 1] = "LEGAL";
        LedgerType[LedgerType["ANALYTICAL"] = 2] = "ANALYTICAL";
        LedgerType[LedgerType["IAS"] = 3] = "IAS";
        LedgerType[LedgerType["CF_CONSOLIDATION_GBP"] = 4] = "CF_CONSOLIDATION_GBP";
        LedgerType[LedgerType["CF_CONSOLIDATION_USD"] = 5] = "CF_CONSOLIDATION_USD";
        LedgerType[LedgerType["CF_CONSOLIDATION_LEDGER"] = 6] = "CF_CONSOLIDATION_LEDGER";
        LedgerType[LedgerType["NOT_USED_7"] = 7] = "NOT_USED_7";
        LedgerType[LedgerType["NOT_USED_8"] = 8] = "NOT_USED_8";
        LedgerType[LedgerType["NOT_USED_9"] = 9] = "NOT_USED_9";
        LedgerType[LedgerType["NOT_USED_10"] = 10] = "NOT_USED_10";
    })(LedgerType = LocalMenus.LedgerType || (LocalMenus.LedgerType = {}));
    let EntryOrigin;
    (function (EntryOrigin) {
        EntryOrigin[EntryOrigin["DIRECT_ENTRY"] = 1] = "DIRECT_ENTRY";
        EntryOrigin[EntryOrigin["AUTOMATIC_LOADING"] = 2] = "AUTOMATIC_LOADING";
        EntryOrigin[EntryOrigin["IMPORT"] = 3] = "IMPORT";
    })(EntryOrigin = LocalMenus.EntryOrigin || (LocalMenus.EntryOrigin = {}));
    let AuthorizationProcessStatus;
    (function (AuthorizationProcessStatus) {
        AuthorizationProcessStatus[AuthorizationProcessStatus["NOT_QUEUED"] = 1] = "NOT_QUEUED";
        AuthorizationProcessStatus[AuthorizationProcessStatus["IN_AUTHORIZATION"] = 2] = "IN_AUTHORIZATION";
        AuthorizationProcessStatus[AuthorizationProcessStatus["AUTHORIZED"] = 3] = "AUTHORIZED";
        AuthorizationProcessStatus[AuthorizationProcessStatus["NOT_AUTHORIZED"] = 4] = "NOT_AUTHORIZED";
        AuthorizationProcessStatus[AuthorizationProcessStatus["YES_AUTOMATIC"] = 5] = "YES_AUTOMATIC";
    })(AuthorizationProcessStatus = LocalMenus.AuthorizationProcessStatus || (LocalMenus.AuthorizationProcessStatus = {}));
})(LocalMenus || (exports.LocalMenus = LocalMenus = {}));
//# sourceMappingURL=local-menu.js.map