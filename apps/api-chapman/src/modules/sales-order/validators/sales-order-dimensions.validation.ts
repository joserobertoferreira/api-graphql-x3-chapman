import { BadRequestException } from '@nestjs/common';
import { Dimensions } from '@prisma/client';
import { DimensionEntity, DimensionTypeConfig } from '../../../common/types/dimension.types';
import { SalesOrderDimensionContext } from '../../../common/types/sales-order.types';
import { executeDimensionStrategiesForLine, mandatoryDimension } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { SalesOrderLineInput } from '../dto/create-sales-order.input';

/**
 * Validate order line dimensions.
 * @param line - order line to validate.
 * @param dimensions - Dimensions applicable for the company.
 * @param dimensionNames - Map of dimension type codes to their field names.
 * @param dimensionTypesMap - Map of dimension type codes to their configurations.
 * @param dimensionsDataMap - Map of existing Dimensions data for validation.
 * @param dimensionStrategyFactory - Factory to get dimension strategies.
 * @returns - void if all dimensions are valid.
 * @throws BadRequestException if any dimension is invalid.
 */
export async function validateDimensionRules(
  line: SalesOrderLineInput,
  dimensions: DimensionEntity[],
  dimensionNames: Map<string, string>,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionStrategyFactory: DimensionStrategyFactory,
  context: {
    lineNumber: number;
    referenceDate: Date;
    referenceCompany: string;
    referenceSite: string;
    isLegalCompany: boolean;
  },
): Promise<void> {
  const { lineNumber, referenceDate } = context;

  const requiredDimensions = new Set(dimensions.map((d) => d.dimensionType));
  const providedDimensions = new Map<string, string>();

  if (line.dimensions) {
    for (const [field, type] of dimensionTypesMap.entries()) {
      if (line.dimensions[field]) {
        const value = line.dimensions[field];
        providedDimensions.set(type.code, value);
      }
    }
  }

  // Validate dimensions against sales order requirements
  for (const requiredType of requiredDimensions) {
    const dimension = mandatoryDimension(requiredType, dimensionTypesMap);

    // If the dimension is mandatory but not provided, throw an error
    if (dimension?.isMandatory && !providedDimensions.has(requiredType)) {
      throw new BadRequestException(
        `Line #${lineNumber}: Missing required dimension type ${dimensionNames.get(requiredType)} for order.`,
      );
    }
  }

  // Check for any invalid dimension types provided
  for (const providedType of providedDimensions.keys()) {
    if (!requiredDimensions.has(providedType)) {
      throw new BadRequestException(
        `Line #${lineNumber}: Dimension type ${dimensionNames.get(providedType)} is not applicable for order.`,
      );
    }
  }

  // Check if the order requires any dimension
  if (requiredDimensions.size > 0) {
    // If the order requires dimensions, ensure that the line has dimensions provided
    if (providedDimensions.size === 0) {
      throw new BadRequestException(
        `Line #${lineNumber}: The order requires these ` +
          `dimensions to be provided: [${[...requiredDimensions].join(', ')}].`,
      );
    } else {
      await executeDimensionStrategiesForLine(
        providedDimensions, // Map of {type -> value} for the dimensions on this line,
        dimensionsDataMap, // Map of pre-fetched dimension data
        dimensionStrategyFactory, // The factory
        {
          line: line,
          lineNumber: lineNumber,
          referenceDate: referenceDate,
        },
        (dimensionData, ctx) => {
          const usageContext: SalesOrderDimensionContext = {
            dimensionData: dimensionData,
            referenceDate: ctx.referenceDate,
            line: ctx.line,
            lineNumber: ctx.lineNumber,
          };
          return usageContext;
        },
      );

      // If fixture dimension are provided, check if the sales order in service date range
      if (providedDimensions.has('fixture')) {
        const fixtureDimension = providedDimensions.get('fixture');
      }
    }
  }
}
