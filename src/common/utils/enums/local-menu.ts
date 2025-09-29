export namespace LocalMenus {
  export enum NoYes {
    // X3 local menu 1

    NO = 1,
    YES = 2,
  }

  export enum EntryMode {
    // X3 local menu 35

    ENTERED = 1,
    DISPLAYED = 2,
    HIDDEN = 3
  }

  export enum DefinitionLevel {
    // X3 local menu 45
    FOLDER = 1,
    COMPANY = 2,
    SITE = 3,
  }

  export enum SequenceNumberType {
    // X3 local menu 46
    ALPHANUMERIC = 1,
    NUMERIC = 2,
  }

  export enum SequenceNumberFields {
    // X3 local menu 47
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
    FORMULA = 12,
  }

  export enum ResetSequenceNumberToZero {
    // X3 local menu 48
    NO_RTZ = 1,
    ANNUAL = 2,
    MONTHLY = 3,
    FISCAL_YEAR = 4,
    PERIOD = 5,
  }

  export enum ExchangeRateType {
    // X3 local menu 202

    DAILY_RATE = 1,
    MONTHLY_RATE = 2,
    AVERAGE_RATE = 3,
    CUSTOMS_DOC_FILE_EXCHANGE = 4,
  }

  export enum FiscalYearPeriodStatus {
    // X3 local menu 214

    NOT_OPEN = 1,
    OPEN = 2,
    CLOSED = 3,
  }

  export enum LineStatus {
    // X3 local menu 279

    PENDING = 1,
    LATE = 2,
    CLOSED = 3,
  }

  export enum OrderCategory {
    // X3 local menu 412

    NORMAL = 1,
    LOAN = 2,
    DIRECT_INVOICING = 3,
    CONTRACT_ORDER = 4,
  }

  export enum OrderStatus {
    // X3 local menu 415

    OPEN = 1,
    CLOSED = 2,
  }

  export enum InvoiceStatus {
    // X3 local menu 418

    NOT_INVOICED = 1,
    PARTLY_INVOICED = 2,
    INVOICED = 3,
  }

  export enum PaymentApprovalType {
    // X3 local menu 510

    NOT_APPROVED = 1,
    CONFLICT = 2,
    DELAYED = 3,
    AUTHORIZED_TO_PAY = 4,
  }

  export enum PurchaseInvoiceType {
    // X3 local menu 533

    INVOICE = 1,
    COMPLEMENT_INVOICE = 2,
    CREDIT_NOTE = 3,
    CREDIT_NOTE_RETURN = 4,
  }

  export enum TaxManagement {
    // X3 local menu 608

    NOT_SUBJECTED = 1,
    SUBJECTED = 2,
    TAX_ACCOUNT = 3,
    EEC_TAX = 4,
    DOWN_PAYMENT_ACCOUNT = 5,
  }

  export enum SignByDefault {
    // X3 local menu 610

    DEBIT = 1,
    CREDIT = 2,
    UNSPECIFIED = 3,
  }

  export enum AccountingJournalStatus {
    // X3 local menu 617

    TEMPORARY = 1,
    FINAL = 2,
  }

  export enum AccountingJournalCategory {
    // X3 local menu 618

    ACTUAL = 1,
    ACTIVE_SIMULATION = 2,
    INACTIVE_SIMULATION = 3,
    EXCEPTIONAL = 4,
    TEMPLATE = 5,
  }

  export enum InvoiceType {
    // X3 local menu 645

    INVOICE = 1,
    CREDIT_NOTE = 2,
    DEBIT_NOTE = 3,
    CREDIT_MEMO = 4,
    PROFORMA = 5,
  }

  export enum RateDate {
    // X3 local menu 917

    JOURNAL_ENTRY_DATE = 1,
    SOURCE_DOCUMENT_DATE = 2,
  }

  export enum EntityType {
    // X3 local menu 943

    BUSINESS_PARTNER = 1,
    COMPANY = 2,
    SITE = 3,
    USER = 4,
    ACCOUNTS = 5,
    LEADS = 6,
    BUILDING = 7,
    PLACE = 8,
  }

  export enum InvoiceAccountingStatus {
    // X3 local menu 2261

    NOT_POSTED = 1,
    NOT_USED = 2,
    POSTED = 3,
  }

  export enum DueDateItemType {
    // X3 local menu 2614

    ORDER = 1,
    INVOICE = 2,
    PAYMENT = 3,
    OTHERS = 4,
  }

  export enum FiscalYearReport {
    // X3 local menu 2618

    NOT_OPEN = 1,
    OPEN = 2,
    CLOSED = 3,
  }

  export enum LedgerType {
    // X3 local menu 2644

    LEGAL = 1,
    ANALYTICAL = 2,
    IAS = 3,
    CF_CONSOLIDATION_GBP = 4,
    CF_CONSOLIDATION_USD = 5,
    CF_CONSOLIDATION_LEDGER = 6,
    NOT_USED_7 = 7,
    NOT_USED_8 = 8,
    NOT_USED_9 = 9,
    NOT_USED_10 = 10,
  }

  export enum EntryOrigin {
    // X3 local menu 2801

    DIRECT_ENTRY = 1,
    AUTOMATIC_LOADING = 2,
    IMPORT = 3,
  }
}
