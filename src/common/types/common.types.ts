import { Prisma, PrismaClient, TextToTranslate } from '@prisma/client';
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

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type AnalyticalEntryWhereInput = Prisma.AnalyticEntryTransactionsWhereInput;

export type AnalyticalEntrySelect = {
  tableAbbreviation: true;
  transaction: true;
  dimensionType: true;
};

export type AnalyticalEntry = {
  tableAbbreviation: string;
  transaction: string;
  dimensionType: string;
};

export interface RawLedgersFromDb {
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

export interface FindTaxCodesArgs {
  where?: Prisma.TaxCodesWhereInput;
  orderBy?: Prisma.TaxCodesOrderByWithRelationInput;
  skip?: number;
  take?: number;
  select?: Prisma.TaxCodesSelect; // Essencial para selecionar campos específicos
}

export interface MiscellaneousInclude {
  descriptions?: {
    description?: boolean;
    shortDescription?: boolean;
    select?: Prisma.TextToTranslateSelectScalar;
  };
}

export interface FindMiscellaneousTableArgs {
  where?: Prisma.MiscellaneousTableWhereInput;
  orderBy?: Prisma.MiscellaneousTableOrderByWithRelationInput;
  skip?: number;
  take?: number;
  select?: Prisma.MiscellaneousTableSelect; // Essencial para selecionar campos específicos
  include?: MiscellaneousInclude; // Inclui campos relacionados, se necessário
}

type BaseMiscellaneousResult<T extends FindMiscellaneousTableArgs> = Prisma.MiscellaneousTableGetPayload<T>;

export type MiscellaneousResult<T extends FindMiscellaneousTableArgs> = BaseMiscellaneousResult<T> &
  (T['include'] extends { descriptions?: { description?: true } } ? { description: TextToTranslate | null } : {}) &
  (T['include'] extends { descriptions?: { shortDescription?: true } }
    ? { shortDescription: TextToTranslate | null }
    : {});

export interface SequenceArgs {
  sequenceName: string;
  transaction?: PrismaTransactionClient;
}

export const DEFAULT_LEGACY_DATE = new Date('1753-01-01');
export const DEFAULT_LEGACY_DATETIME = new Date('1753-01-01T00:00:00.000Z');

export const DEFAULT_PYRAMID_GROUP_CODE_VALUES: Pick<
  Prisma.PrintPyramidsCreateInput,
  | 'groupCode1'
  | 'groupCode2'
  | 'groupCode3'
  | 'groupCode4'
  | 'groupCode5'
  | 'groupCode6'
  | 'groupCode7'
  | 'groupCode8'
  | 'groupCode9'
  | 'groupCode10'
> = {
  groupCode1: 'zzzzz',
  groupCode2: 'zzzzz',
  groupCode3: 'zzzzz',
  groupCode4: 'zzzzz',
  groupCode5: 'zzzzz',
  groupCode6: 'zzzzz',
  groupCode7: 'zzzzz',
  groupCode8: 'zzzzz',
  groupCode9: 'zzzzz',
  groupCode10: 'zzzzz',
};
