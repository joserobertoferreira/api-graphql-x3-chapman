import { Prisma, ProductCategory } from '@prisma/client';
import { CreateProductInput } from '../dto/create-product.input';

export type ProductCreationPayloads = {
  productMaster: Prisma.ProductsCreateInput;
  productSales: Prisma.ProductSalesCreateInput;
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
  const productMasterPayload: Prisma.ProductsUncheckedCreateInput = {
    code: input.code,
    productCategory: category.code,
    description1: input.descriptions[0],
    description2: input.descriptions[1] ?? '',
    description3: input.descriptions[2] ?? '',
    salesUnit: input.salesUnit ?? category.salesUnit,
    purchaseUnit: input.purchaseUnit ?? category.purchaseUnit,
    stockUnit: input.salesUnit ?? category.stockUnit,
    weightUnit: category.weightUnit,
    productWeight: category.stockUnitWeight,
    volumeUnit: category.volumeUnit,
    productVolume: category.stockUnitVolume,
    taxLevel1: input.taxesLevel[0] ?? category.taxLevel1,
    taxLevel2: input.taxesLevel[1] ?? category.taxLevel2,
    taxLevel3: input.taxesLevel[2] ?? category.taxLevel3,
    productStatisticalGroup1: input.productStatisticalGroup?.[0] ?? category.StatisticalGroup1,
    productStatisticalGroup2: input.productStatisticalGroup?.[1] ?? category.StatisticalGroup2,
    productStatisticalGroup3: input.productStatisticalGroup?.[2] ?? category.StatisticalGroup3,
    productStatisticalGroup4: input.productStatisticalGroup?.[3] ?? category.StatisticalGroup4,
    productStatisticalGroup5: input.productStatisticalGroup?.[4] ?? category.StatisticalGroup5,
    productStatus: 1,
  };

  const productSalesPayload: Prisma.ProductSalesCreateInput = {
    code: input.code,
    description: input.descriptions[0],
    basePrice: input.basePrice ?? 0,
  };

  return {
    productMaster: productMasterPayload,
    productSales: productSalesPayload,
  };
}
