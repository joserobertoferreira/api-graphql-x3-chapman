import { Decimal } from '@prisma/client/runtime/library';

export interface Ledgers {
  LED_0: string;
  LED_1: string;
  LED_2: string;
  LED_3: string;
  LED_4: string;
  LED_5: string;
  LED_6: string;
  LED_7: string;
  LED_8: string;
  LED_9: string;
}

export interface TabRatVatRecord {
  VAT_0: string;
  STRDAT_0: Date;
  VATRAT_0: Decimal;
}

export interface TabRatCurRecord {
  CUR_0: string;
  EURFLG_0: number;
  EURRAT_0: Decimal;
  EURDAT_0: Date;
}

export interface PurchaseSequenceNumber {
  legislation: string;
  counter: string;
}

export type RateCurrency = {
  rate: Decimal;
  status: number;
};

export const DEFAULT_LEGACY_DATE = new Date('1753-01-01');
export const DEFAULT_LEGACY_DATETIME = new Date('1753-01-01T00:00:00.000Z');
