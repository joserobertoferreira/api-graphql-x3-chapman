import { Decimal } from '@prisma/client/runtime/library';

export interface Ledgers {
  ledgers: string[];
}

export interface LedgerPlanCode {
  code: string;
  planCode: string;
}

export interface TabRatVatRecord {
  tax: string;
  legislation: string;
  company: string;
  validFrom: Date;
  rate: Decimal;
}

export interface TabRatCurRecord {
  currency: string;
  euroFlag: number;
  euroRate: Decimal;
  euroChangeOverDate: Date;
}

export interface PurchaseSequenceNumber {
  legislation: string;
  counter: string;
}

export type RateCurrency = {
  rate: Decimal;
  divisor?: Decimal;
  status: number;
};

export const DEFAULT_LEGACY_DATE = new Date('1753-01-01');
export const DEFAULT_LEGACY_DATETIME = new Date('1753-01-01T00:00:00.000Z');
