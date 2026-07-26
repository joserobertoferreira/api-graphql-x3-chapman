import { Prisma } from 'src/generated/prisma/client';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SiteTypes {
  export type WithInclude<I extends Prisma.SiteInclude> = Prisma.SiteGetPayload<{ include: I }>;

  export type Payload<I extends Prisma.SiteInclude> = WithInclude<I> | null;

  export type WithCompany = WithInclude<{ company: true }>;
}

export type SiteArgs = {
  include?: Prisma.SiteInclude;
  select?: Prisma.SiteSelect;
};

/** The Company model with selected fields. */
export type SiteModel = Prisma.SiteGetPayload<{
  select: typeof siteModelSelect;
}>;

// Constants

/**
 * Prisma select object for the Company model.
 */
export const siteModelSelect = {
  legislation: true,
  dimensionType1: true,
  dimensionType2: true,
  dimensionType3: true,
  dimensionType4: true,
  dimensionType5: true,
  dimensionType6: true,
  dimensionType7: true,
  dimensionType8: true,
  dimensionType9: true,
  dimensionType10: true,
  dimension1: true,
  dimension2: true,
  dimension3: true,
  dimension4: true,
  dimension5: true,
  dimension6: true,
  dimension7: true,
  dimension8: true,
  dimension9: true,
  dimension10: true,
  manufacturing: true,
  sales: true,
  purchasing: true,
  warehouse: true,
  accounting: true,
  financialSite: true,
} satisfies Prisma.SiteSelect;
