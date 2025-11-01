import { BadRequestException } from '@nestjs/common';
import { Dimensions } from 'src/generated/prisma';
import {
  DimensionsEntity,
  DimensionTypeConfig,
  PurchaseOrderDimensionContext,
} from '../../../common/types/dimension.types';
import { DimensionService } from '../../dimensions/dimension.service';
import { executeDimensionStrategiesForLine } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { PurchaseOrderLineInput } from '../dto/create-purchase-order.input';

/**
 * Validate order line dimensions.
 * @param line - order line to validate.
 * @param dimensionsEntity - Dimensions applicable for the company.
 * @param dimensionNames - Map of dimension type codes to their field names.
 * @param dimensionTypesMap - Map of dimension type codes to their configurations.
 * @param dimensionsDataMap - Map of existing Dimensions data for validation.
 * @param dimensionService - Service to handle dimension operations.
 * @param dimensionStrategyFactory - Factory to get dimension strategies.
 * @returns - void if all dimensions are valid.
 * @throws BadRequestException if any dimension is invalid.
 */
export async function validateDimensionRules(
  line: PurchaseOrderLineInput,
  dimensionsEntity: DimensionsEntity[],
  dimensionNames: Map<string, string>,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionService: DimensionService,
  dimensionStrategyFactory: DimensionStrategyFactory,
  context: { lineNumber: number; referenceDate: Date },
): Promise<void> {
  const { lineNumber, referenceDate } = context;

  const { requiredDimensions, providedDimensions } = dimensionService.getRequiredDimensions(
    lineNumber,
    '',
    line.dimensions || {},
    dimensionsEntity,
    dimensionNames,
    dimensionTypesMap,
    `for order`,
  );

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
        dimensionNames,
        providedDimensions, // Map of {type -> value} for the dimensions on this line,
        dimensionsDataMap, // Map of pre-fetched dimension data
        dimensionStrategyFactory, // The factory
        {
          line: line,
          lineNumber: lineNumber,
          referenceDate: referenceDate,
        },
        (dimensionData, ctx) => {
          const usageContext: PurchaseOrderDimensionContext = {
            dimensionData: dimensionData,
            isIntercompany: false,
            referenceDate: ctx.referenceDate,
            line: ctx.line,
            lineNumber: ctx.lineNumber,
            process: 'purchase-order',
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
