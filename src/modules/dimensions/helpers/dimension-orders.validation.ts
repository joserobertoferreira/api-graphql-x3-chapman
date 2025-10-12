import { BadRequestException } from '@nestjs/common';
import { Dimensions } from '@prisma/client';
import { DimensionEntity, DimensionTypeConfig } from '../../../common/types/dimension.types';
import { PurchaseOrderDimensionContext } from '../../../common/types/purchase-order.types';
import { SalesOrderDimensionContext } from '../../../common/types/sales-order.types';
import { PurchaseOrderLineInput } from '../../purchase-order/dto/create-purchase-order.input';
import { SalesOrderLineInput } from '../../sales-order/dto/create-sales-order.input';
import { DimensionStrategyFactory } from '../strategies/dimension-strategy.factory';
import { executeDimensionStrategiesForLine, mandatoryDimension } from './dimension.helper';

type OrdersInput = SalesOrderLineInput | PurchaseOrderLineInput;

type OrderStrategy = {
  lineNumber: number;
  referenceDate: Date;
  referenceCompany: string;
  referenceSite: string;
  isLegalCompany: boolean;
  process: string;
};

/**
 * GENERIC function to validate dimension rules for any order line.
 * @param C - O tipo específico do contexto de uso da dimensão (ex: PurchaseOrderDimensionContext).
 *
 * @param line - The order line to validate.
 * @param dimensions - Dimensions applicable for the company.
 * @param dimensionNames - Map of dimension type codes to their field names.
 * @param dimensionTypesMap - Map of dimension type codes to their configurations.
 * @param dimensionsDataMap - Map of existing Dimensions data for validation.
 * @param dimensionStrategyFactory - Factory to get dimension strategies.
 * @param context - Additional context for validation.
 * @param buildUsageContextFn - A function to build the specific usage context.
 * @returns - void if all dimensions are valid.
 * @throws BadRequestException if any dimension is invalid.
 */
export async function validateDimensionRules(
  line: OrdersInput,
  dimensions: DimensionEntity[],
  dimensionNames: Map<string, string>,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionStrategyFactory: DimensionStrategyFactory,
  context: OrderStrategy,
): Promise<void> {
  const { lineNumber } = context;

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

  // Validate dimensions against order requirements
  for (const requiredType of requiredDimensions) {
    const dimension = mandatoryDimension(requiredType, dimensionTypesMap);

    // If the dimension is mandatory but not provided, throw an error
    if (dimension?.isMandatory && !providedDimensions.has(requiredType)) {
      throw new BadRequestException(
        `Line #${lineNumber}: Missing required dimension ${dimensionNames.get(requiredType)} for order.`,
      );
    }
  }

  // Check for any invalid dimension types provided
  for (const providedType of providedDimensions.keys()) {
    if (!requiredDimensions.has(providedType)) {
      throw new BadRequestException(
        `Line #${lineNumber}: Dimension ${dimensionNames.get(providedType)} is not applicable for order.`,
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
        { line: line, ...context },
        (dimensionData, ctx) => {
          // Build the specific usage context
          let usageContext: PurchaseOrderDimensionContext | SalesOrderDimensionContext | undefined = undefined;

          if ('process' in ctx && ctx.process) {
            switch (ctx.process) {
              case 'purchase-order':
                // Handle purchase order specific logic
                usageContext = {
                  dimensionData: dimensionData,
                  referenceDate: ctx.referenceDate,
                  referenceCompany: ctx.referenceCompany,
                  referenceSite: ctx.referenceSite,
                  isLegalCompany: ctx.isLegalCompany,
                  line: ctx.line as PurchaseOrderLineInput,
                  lineNumber: ctx.lineNumber,
                };
                break;
              case 'sales-order':
                // Handle sales order specific logic
                usageContext = {
                  dimensionData: dimensionData,
                  referenceDate: ctx.referenceDate,
                  referenceCompany: ctx.referenceCompany,
                  referenceSite: ctx.referenceSite,
                  isLegalCompany: ctx.isLegalCompany,
                  line: ctx.line as SalesOrderLineInput,
                  lineNumber: ctx.lineNumber,
                };
                break;
            }
          }
          return usageContext!;
        },
      );

      // If fixture dimension are provided, check if the sales order in service date range
      if (providedDimensions.has('fixture')) {
        const fixtureDimension = providedDimensions.get('fixture');
      }
    }
  }
}
