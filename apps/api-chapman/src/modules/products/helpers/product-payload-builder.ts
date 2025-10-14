import { Prisma, ProductCategory } from 'src/generated/prisma';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { CreateProductInput } from '../dto/create-product.input';

export type ProductCreationPayloads = {
  productMaster: Prisma.ProductsCreateInput;
  productSales?: Prisma.ProductSalesCreateInput;
};

/**
 * Constrói os payloads para a criação de um novo produto e suas entidades relacionadas.
 * @param input - O DTO vindo da mutation do GraphQL.
 * @param category - O objeto da categoria de produto, usado para herdar valores padrão.
 * @returns Um objeto contendo os payloads para Products (ITMMASTER) e ProductSales (ITMSALES).
 */
export function buildProductCreationPayloads(
  input: CreateProductInput,
  category: ProductCategory,
): ProductCreationPayloads {
  // Lógica para o payload de Products (ITMMASTER)
  const descriptions = input.descriptions || ['', '', ''];
  const taxesLevel = input.taxesLevel || [category.taxLevel1, category.taxLevel2, category.taxLevel3];
  const productStatisticalGroup = input.productStatisticalGroup || [
    category.StatisticalGroup1,
    category.StatisticalGroup2,
    category.StatisticalGroup3,
    category.StatisticalGroup4,
    category.StatisticalGroup5,
  ];

  const productMasterPayload: Prisma.ProductsUncheckedCreateInput = {
    code: input.code,
    productCategory: category.code,
    description1: descriptions[0],
    description2: descriptions[1],
    description3: descriptions[2],
    salesUnit: input.salesUnit ?? category.salesUnit,
    salesUnitToStockUnitConversionFactor: category.salesUnitToStockUnitConversionFactor,
    isSalesFactorEntryAllowed: category.isSalesConversionFactorEntryAllowed,
    purchaseUnit: input.purchaseUnit ?? category.purchaseUnit,
    purchaseUnitToStockUnitConversionFactor: category.purchaseUnitToStockUnitConversionFactor,
    isPurchaseFactorEntryAllowed: category.isPurchaseConversionFactorEntryAllowed,
    stockUnit: input.salesUnit ?? category.stockUnit,
    statisticalUnit: input.salesUnit ?? category.statisticUnit,
    statisticalUnitToStockUnitConversionFactor: category.statisticUnitToStockUnitConversionFactor,
    euUnit: input.salesUnit ?? category.euUnit,
    euUnitToStockUnitConversionFactor: category.euUnitToStockUnitConversionFactor,
    weightUnit: category.weightUnit,
    productWeight: category.stockUnitWeight,
    volumeUnit: category.volumeUnit,
    productVolume: category.stockUnitVolume,
    taxLevel1: taxesLevel[0],
    taxLevel2: taxesLevel[1],
    taxLevel3: taxesLevel[2],
    productStatisticalGroup1: productStatisticalGroup[0],
    productStatisticalGroup2: productStatisticalGroup[1],
    productStatisticalGroup3: productStatisticalGroup[2],
    productStatisticalGroup4: productStatisticalGroup[3],
    productStatisticalGroup5: productStatisticalGroup[4],
    productStatus: 1,
    dimensionType1: category.dimensionType1,
    dimensionType2: category.dimensionType2,
    dimensionType3: category.dimensionType3,
    dimensionType4: category.dimensionType4,
    dimensionType5: category.dimensionType5,
    dimension1: category.dimension1,
    dimension2: category.dimension2,
    dimension3: category.dimension3,
    dimension4: category.dimension4,
    dimension5: category.dimension5,
    accountingCode: input.accountingCode ?? category.accountingCode,
    stockManagementMode: category.stockManagementMode,
    lotManagementMode: category.lotManagementMode,
    serialNumberManagementMode: category.serialNumberManagementMode,
    isNegativeStockAuthorized: category.isNegativeStockAuthorized,
    materialCostGroup: category.materialCostGroup,
    userAccessCode: category.userAccessCode,
    isBought: category.isBought,
    isSold: category.isSold,
    isDeliverable: category.isDeliverable,
    isReceived: category.isReceived,
    createDate: getAuditTimestamps().date,
    updateDate: getAuditTimestamps().date,
    createDatetime: getAuditTimestamps().dateTime,
    updateDatetime: getAuditTimestamps().dateTime,
    singleID: generateUUIDBuffer(),
  };

  let productSalesPayload: Prisma.ProductSalesCreateInput | undefined = undefined;

  if (category.isSold === 2) {
    productSalesPayload = {
      code: input.code,
      type: category.type,
      description: input.descriptions[0],
      basePrice: new Prisma.Decimal(input.basePrice ?? 0),
      loanAuthorized: category.loanAuthorized,
      backToBackOrder: category.backToBackOrder,
      versionPreload: category.versionPreload,
      createDate: getAuditTimestamps().date,
      updateDate: getAuditTimestamps().date,
      createDatetime: getAuditTimestamps().dateTime,
      updateDatetime: getAuditTimestamps().dateTime,
      singleID: generateUUIDBuffer(),
    };
  }

  return {
    productMaster: productMasterPayload,
    productSales: productSalesPayload,
  };
}
