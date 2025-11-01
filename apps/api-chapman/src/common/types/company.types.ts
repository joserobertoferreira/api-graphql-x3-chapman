import { Prisma } from '../../generated/prisma';

// Types

/**
 * Arguments for querying a Company.
 */
export type CompanyArgs = {
  include?: Prisma.CompanyInclude;
  select?: Prisma.CompanySelect;
};

/** The Company model with selected fields. */
export type CompanyModel = Prisma.CompanyGetPayload<{
  select: typeof companyModelSelect;
}>;

// Constants

/**
 * Prisma select object for the Company model.
 */
export const companyModelSelect = Prisma.validator<Prisma.CompanySelect>()({
  accountingModel: true,
  accountingCurrency: true,
  legislation: true,
  isLegalCompany: true,
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
  isMandatoryDimension1: true,
  isMandatoryDimension2: true,
  isMandatoryDimension3: true,
  isMandatoryDimension4: true,
  isMandatoryDimension5: true,
  isMandatoryDimension6: true,
  isMandatoryDimension7: true,
  isMandatoryDimension8: true,
  isMandatoryDimension9: true,
  isMandatoryDimension10: true,
});
