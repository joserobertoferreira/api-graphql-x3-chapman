export namespace LocalMenus {
  export enum NoYes {
    // X3 local menu 1

    NO = 1,
    YES = 2,
  }

  export enum Chapter45 {
    FOLDER = 1,
    COMPANY = 2,
    SITE = 3,
  }

  export enum Chapter46 {
    ALPHANUMERIC = 1,
    NUMERIC = 2,
  }

  export enum Chapter47 {
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

  export enum Chapter48 {
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

  export enum LineStatus {
    // X3 local menu 279

    PENDING = 1,
    LATE = 2,
    CLOSED = 3,
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

  export enum InvoiceType {
    // X3 local menu 645

    INVOICE = 1,
    CREDIT_NOTE = 2,
    DEBIT_NOTE = 3,
    CREDIT_MEMO = 4,
    PROFORMA = 5,
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
}
