export declare namespace LocalMenus {
    enum NoYes {
        NO = 1,
        YES = 2
    }
    enum EntryMode {
        ENTERED = 1,
        DISPLAYED = 2,
        HIDDEN = 3
    }
    enum DefinitionLevel {
        FOLDER = 1,
        COMPANY = 2,
        SITE = 3
    }
    enum SequenceNumberType {
        ALPHANUMERIC = 1,
        NUMERIC = 2
    }
    enum SequenceNumberFields {
        CONSTANT = 1,
        YEAR = 2,
        MONTH = 3,
        WEEK = 4,
        DAY = 5,
        COMPANY = 6,
        SITE = 7,
        SEQUENCE_NUMBER = 8,
        COMPLEMENT = 9,
        FISCAL_YEAR = 10,
        PERIOD = 11,
        FORMULA = 12
    }
    enum ResetSequenceNumberToZero {
        NO_RTZ = 1,
        ANNUAL = 2,
        MONTHLY = 3,
        FISCAL_YEAR = 4,
        PERIOD = 5
    }
    enum ExchangeRateType {
        DAILY_RATE = 1,
        MONTHLY_RATE = 2,
        AVERAGE_RATE = 3,
        CUSTOMS_DOC_FILE_EXCHANGE = 4
    }
    enum FiscalYearPeriodStatus {
        NOT_OPEN = 1,
        OPEN = 2,
        CLOSED = 3
    }
    enum ProductCreationMode {
        DIRECT = 1,
        WITH_VALIDATION = 2
    }
    enum PriceWithWithoutTax {
        PRICE_EXCLUDING_TAX = 1,
        PRICE_INCLUDING_TAX = 2
    }
    enum LineStatus {
        PENDING = 1,
        LATE = 2,
        CLOSED = 3
    }
    enum DueDateType {
        TERMS = 1,
        DEPOSIT = 2,
        RETENTION_GUARANTEE = 3
    }
    enum OrderCategory {
        NORMAL = 1,
        LOAN = 2,
        DIRECT_INVOICING = 3,
        CONTRACT_ORDER = 4
    }
    enum OrderStatus {
        OPEN = 1,
        CLOSED = 2
    }
    enum InvoiceStatus {
        NOT_INVOICED = 1,
        PARTLY_INVOICED = 2,
        INVOICED = 3
    }
    enum OrderType {
        ORDER = 1,
        CONTRACT_ORDER = 2
    }
    enum PurchaseType {
        COMMERCIAL = 1,
        GENERAL = 2
    }
    enum PaymentApprovalType {
        NOT_APPROVED = 1,
        CONFLICT = 2,
        DELAYED = 3,
        AUTHORIZED_TO_PAY = 4
    }
    enum PurchaseInvoiceType {
        INVOICE = 1,
        COMPLEMENT_INVOICE = 2,
        CREDIT_NOTE = 3,
        CREDIT_NOTE_RETURN = 4
    }
    enum TaxManagement {
        NOT_SUBJECTED = 1,
        SUBJECTED = 2,
        TAX_ACCOUNT = 3,
        EEC_TAX = 4,
        DOWN_PAYMENT_ACCOUNT = 5
    }
    enum SignByDefault {
        DEBIT = 1,
        CREDIT = 2,
        UNSPECIFIED = 3
    }
    enum AccountingJournalStatus {
        TEMPORARY = 1,
        FINAL = 2
    }
    enum AccountingJournalCategory {
        ACTUAL = 1,
        ACTIVE_SIMULATION = 2,
        INACTIVE_SIMULATION = 3,
        EXCEPTIONAL = 4,
        TEMPLATE = 5
    }
    enum BusinessPartnerType {
        CUSTOMER = 1,
        SUPPLIER = 2
    }
    enum InvoiceType {
        INVOICE = 1,
        CREDIT_NOTE = 2,
        DEBIT_NOTE = 3,
        CREDIT_MEMO = 4,
        PROFORMA = 5
    }
    enum RateDate {
        JOURNAL_ENTRY_DATE = 1,
        SOURCE_DOCUMENT_DATE = 2
    }
    enum EntityType {
        BUSINESS_PARTNER = 1,
        COMPANY = 2,
        SITE = 3,
        USER = 4,
        ACCOUNTS = 5,
        LEADS = 6,
        BUILDING = 7,
        PLACE = 8
    }
    enum InvoiceAccountingStatus {
        NOT_POSTED = 1,
        NOT_USED = 2,
        POSTED = 3
    }
    enum DueDateItemType {
        ORDER = 1,
        INVOICE = 2,
        PAYMENT = 3,
        OTHERS = 4
    }
    enum FiscalYearReport {
        NOT_OPEN = 1,
        OPEN = 2,
        CLOSED = 3
    }
    enum LedgerType {
        LEGAL = 1,
        ANALYTICAL = 2,
        IAS = 3,
        CF_CONSOLIDATION_GBP = 4,
        CF_CONSOLIDATION_USD = 5,
        CF_CONSOLIDATION_LEDGER = 6,
        NOT_USED_7 = 7,
        NOT_USED_8 = 8,
        NOT_USED_9 = 9,
        NOT_USED_10 = 10
    }
    enum EntryOrigin {
        DIRECT_ENTRY = 1,
        AUTOMATIC_LOADING = 2,
        IMPORT = 3
    }
    enum AuthorizationProcessStatus {
        NOT_QUEUED = 1,
        IN_AUTHORIZATION = 2,
        AUTHORIZED = 3,
        NOT_AUTHORIZED = 4,
        YES_AUTOMATIC = 5
    }
}
