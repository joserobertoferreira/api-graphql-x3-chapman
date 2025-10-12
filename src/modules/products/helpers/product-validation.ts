import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommonService } from '../../../common/services/common.service';
import { ProductValidation } from '../../../common/types/products.types';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Helper functions for validating product data.
 * @param context - The context containing product information to validate.
 * @throws Will throw an error if any product is invalid.
 */
export async function validateProducts(
  context: ProductValidation[],
  prisma: PrismaService,
  commonService: CommonService,
): Promise<ProductValidation[]> {
  // Extract unique product codes from the lines
  const productsToValidate = [...new Set(context.map((line) => line.code))];

  const existingProducts = await prisma.products.findMany({
    where: {
      code: { in: productsToValidate },
    },
    select: {
      code: true,
      taxLevel1: true,
    },
  });

  // Check if the number of products found matches the number of unique products to validate.
  if (existingProducts.length !== productsToValidate.length) {
    // If not, it means one or more products were not found. Create a set of found product codes for quick lookup
    const foundProductCodes = new Set(existingProducts.map((p) => p.code));
    const missingProducts = productsToValidate.filter((code) => !foundProductCodes.has(code));

    throw new NotFoundException(`The following products do not exist: ${missingProducts.join(', ')}.`);
  }

  const productValidations: ProductValidation[] = [];

  // Check if the tax level is valid for each product
  for (const line of context) {
    const product = existingProducts.find((p) => p.code === line.code);
    if (!product) {
      // This should not happen as we already checked for missing products, but just in case
      throw new NotFoundException(`Product ${line.code} not found.`);
    }

    if (line.taxLevelCode !== undefined) {
      if (line.taxLevelCode === null || line.taxLevelCode.trim() === '') {
        throw new BadRequestException('Tax level cannot be null or an empty string.');
      }
    } else {
      line.taxLevelCode = product.taxLevel1; // Default tax level from product
    }

    const taxLevelExists = await commonService.productTaxRuleExists(line.taxLevelCode, line.legislation, true);
    if (!taxLevelExists) {
      const taxLevelExistsNoLeg = await commonService.productTaxRuleExists(line.taxLevelCode, '', true);
      if (!taxLevelExistsNoLeg) {
        throw new NotFoundException(
          `Tax level ${line.taxLevelCode} not found for product ${product.code} or is inactive.`,
        );
      }
    }

    // Validate if tax determination exists for the business partner tax rule and product tax level
    const taxDetermination = `${line.taxRule}_${line.taxLevelCode}`;
    const taxDeterminationExists = await commonService.taxDeterminationExists(taxDetermination, line.legislation, true);
    if (!taxDeterminationExists) {
      const taxDeterminationExistsNoLeg = await commonService.taxDeterminationExists(taxDetermination, '', true);
      if (!taxDeterminationExistsNoLeg) {
        throw new NotFoundException(`Tax determination ${taxDetermination} not found or is inactive.`);
      }
    }

    // Validate gross price if provided
    if (line.grossPrice !== undefined) {
      if (line.grossPrice === null || line.grossPrice < 0) {
        throw new BadRequestException('Gross price cannot be null or negative.');
      }
    }

    productValidations.push({
      ...line,
      taxLevelCode: line.taxLevelCode,
    });
  }

  return productValidations;
}
