import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Company, Dimensions } from '@prisma/client';
import { CommonService } from '../../common/services/common.service';
import { DimensionTypeConfig } from '../../common/types/dimension.types';
import { SalesOrderLineContext } from '../../common/types/sales-order.types';
import { countNonEmptyProperties } from '../../common/utils/common.utils';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { PrismaService } from '../../prisma/prisma.service';
import { validateDimensionRules } from '../dimensions/helpers/dimension-orders.validation';
import { buildDimensionEntity } from '../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../dimensions/strategies/dimension-strategy.factory';
import { SalesOrderLineInput } from './dto/create-sales-order.input';
// import { validateDimensionRules } from './validators/sales-order-dimensions.validation';

/**
 * Validate sales order lines.
 * This function checks each line of a sales order to ensure that:
 */
export async function validateLines(
  referenceDate: Date,
  lines: SalesOrderLineInput[],
  orderTransaction: string,
  salesSite: string,
  company: Company,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionStrategyFactory: DimensionStrategyFactory,
  commonService: CommonService,
  prismaService: PrismaService,
): Promise<SalesOrderLineContext[]> {
  // Collect all dimensions provided in the lines for validation.
  const allDimensions = new Map<string, { dimensionType: string; dimension: string }>();
  for (const line of lines) {
    if (line.dimensions) {
      for (const [field, config] of dimensionTypesMap.entries()) {
        if (line.dimensions[field]) {
          const value = line.dimensions[field];
          const type = config.code;
          const key = `${type}|${value}`;

          if (!allDimensions.has(key)) {
            allDimensions.set(key, { dimensionType: type, dimension: value });
          }
        }
      }
    }
  }

  // Check for duplicate dimension types within each line
  for (const [index, line] of lines.entries()) {
    if (line.dimensions) {
      const seenTypesInLine = new Set<string>();

      // Iterate over the dimension fields to check for duplicates
      for (const field in line.dimensions) {
        const config = dimensionTypesMap.get(field);

        if (config) {
          const type = config.code;

          if (seenTypesInLine.has(type)) {
            throw new BadRequestException(
              `Line ${index + 1}: Duplicate dimension type ${type} provided. ` +
                `Each type can only be specified once per line.`,
            );
          }
          seenTypesInLine.add(type);
        }
      }
    }
  }

  const dimensionNames = new Map<string, string>();
  for (const [field, config] of dimensionTypesMap.entries()) {
    dimensionNames.set(config.code, field);
  }

  const pairsToValidate = Array.from(allDimensions.values());

  // Fetch existing dimensions from the database to validate their existence
  const existingDimensionsData =
    pairsToValidate.length > 0 ? await prismaService.dimensions.findMany({ where: { OR: pairsToValidate } }) : [];

  // Validate existence. Compare what was requested with what was found.
  if (existingDimensionsData.length < pairsToValidate.length) {
    const foundSet = new Set(existingDimensionsData.map((d) => `${d.dimensionType}|${d.dimension}`));
    const notFound = pairsToValidate.find((p) => !foundSet.has(`${p.dimensionType}|${p.dimension}`));

    // If 'notFound' is found (which will be the case), throw a clear error.
    if (notFound) {
      throw new NotFoundException(
        `Dimension value ${notFound.dimension} does not exist for type ${dimensionNames.get(notFound.dimensionType)}.`,
      );
    }
  }

  // Create a map with dimensions data for quick lookup during line validation
  const dimensionsDataMap = new Map<string, Dimensions>(
    existingDimensionsData.map((d) => [`${d.dimensionType}|${d.dimension}`, d]),
  );

  // Fetch dimensions for the sales order transaction
  const transactionDimensions = await commonService.getAnalyticalTransactionData({
    tableAbbreviation: 'SLT',
    transaction: 'APP',
  });
  if (!transactionDimensions || transactionDimensions.length === 0) {
    const allProvidedDimensions = lines.flatMap((line) => line.dimensions ?? []);
    if (allProvidedDimensions.length > 0) {
      throw new BadRequestException(
        `No dimensions are applicable for order transaction ${orderTransaction}, but some were provided.`,
      );
    }
  }

  // Get the dimension applicable for the company
  const numberOfDimensions = countNonEmptyProperties(company, 'dimensionType', 20);
  const dimensions = buildDimensionEntity(company, 'dimensionType', numberOfDimensions || 0, 'dimension');

  // Array to hold the validated line contexts
  const contextLines: SalesOrderLineContext[] = [];

  // Build an array of promises for line validations
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    // Validate dimensions for the line
    // await validateDimensionRules(
    //   line,
    //   dimensions,
    //   dimensionNames,
    //   dimensionTypesMap,
    //   dimensionsDataMap,
    //   dimensionStrategyFactory,
    //   {
    //     lineNumber,
    //     referenceDate,
    //   },
    // );
    await validateDimensionRules(
      line,
      dimensions,
      dimensionNames,
      dimensionTypesMap,
      dimensionsDataMap,
      dimensionStrategyFactory,
      {
        lineNumber,
        referenceDate,
        referenceCompany: company.company,
        referenceSite: salesSite,
        isLegalCompany: company.isLegalCompany === LocalMenus.NoYes.YES,
        process: 'sales-order',
      },
    );

    // If all validations pass, add the line to the context lines
    contextLines.push({
      ...line,
      lineNumber,
      dimensions: line.dimensions ? line.dimensions : {},
    });
  }

  // Return the array of validated line contexts
  return contextLines;
}
