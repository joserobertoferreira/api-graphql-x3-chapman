import { BadRequestException } from '@nestjs/common';
import { Dimensions } from '@prisma/client';
import { DimensionEntity, DimensionTypeConfig } from '../../../common/types/dimension.types';
import { JournalEntryDimensionContext } from '../../../common/types/journal-entry.types';
import { executeDimensionStrategiesForLine, mandatoryDimension } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';

/**
 * Validates a single journal entry line against the business rules of dimensions.
 */
export async function validateDimensionRules(
  line: JournalEntryLineInput,
  dimensions: DimensionEntity[],
  dimensionNames: Map<string, string>,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionStrategyFactory: DimensionStrategyFactory,
  context: { lineNumber: number; ledgerCode: string },
): Promise<void> {
  const { lineNumber, ledgerCode } = context;

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

  // Validate dimensions against account requirements
  for (const requiredType of requiredDimensions) {
    const dimension = mandatoryDimension(requiredType, dimensionTypesMap);

    // If the dimension is mandatory but not provided, throw an error
    if (dimension?.isMandatory && !providedDimensions.has(requiredType)) {
      throw new BadRequestException(
        `Line #${lineNumber}: Ledger [${ledgerCode}]: Missing required dimension type ${dimensionNames.get(requiredType)} for account ${line.account}.`,
      );
    }
  }

  // Check for any invalid dimension types provided
  for (const providedType of providedDimensions.keys()) {
    if (!requiredDimensions.has(providedType)) {
      throw new BadRequestException(
        `Line #${lineNumber}: Ledger [${ledgerCode}]: Dimension type ${dimensionNames.get(providedType)} is not applicable for account ${line.account}.`,
      );
    }
  }

  // Check if the account requires any dimension
  if (requiredDimensions.size > 0) {
    // If the account requires dimensions, ensure that the line has dimensions provided
    if (providedDimensions.size === 0) {
      throw new BadRequestException(
        `Line #${lineNumber}: Ledger [${ledgerCode}]: Account code ${line.account} requires these ` +
          `dimensions to be provided: [${[...requiredDimensions].join(', ')}].`,
      );
    } else {
      await executeDimensionStrategiesForLine(
        providedDimensions, // Map of {type -> value} for the dimensions on this line,
        dimensionsDataMap, // Map of pre-fetched dimension data
        dimensionStrategyFactory, // The factory
        { line: line, lineNumber: lineNumber, ledgerCode: ledgerCode },
        (dimensionData, context) => {
          const usageContext: JournalEntryDimensionContext = {
            dimensionData: dimensionData,
            line: line,
            lineNumber: context.lineNumber,
            ledgerCode: context.ledgerCode,
          };
          return usageContext;
        },
      );
    }
  }
}

// /**
//  * Executes the appropriate validation strategies for all dimensions provided in a single line.
//  * @param line - The journal entry line being validated.
//  * @param providedDimensionsMap - A map of {type -> value} for the dimensions on this line.
//  * @param dimensionsDataMap - A map containing the pre-fetched data for all dimensions.
//  * @param dimensionStrategyFactory - The factory to get the validation strategies.
//  * @param context - Additional context like lineNumber and ledgerCode for error messages.
//  */
// async function executeDimensionStrategiesForLine(
//   line: JournalEntryLineInput,
//   providedDimensionsMap: Map<string, string>,
//   dimensionsDataMap: Map<string, Dimensions>,
//   dimensionStrategyFactory: DimensionStrategyFactory,
//   context: { lineNumber: number; ledgerCode: string },
// ): Promise<void> {
//   // Iterate over the dimensions that were PROVIDED for this line.
//   for (const [dimensionType, dimensionValue] of providedDimensionsMap.entries()) {
//     // Fetch the pre-loaded data for this dimension.
//     const dimensionData = dimensionsDataMap.get(`${dimensionType}|${dimensionValue}`);
//     if (!dimensionData) {
//       throw new Error(`Internal inconsistency: Dimension data for ${dimensionType}|${dimensionValue} not pre-loaded.`);
//     }

//     // Get the validation strategies for this DIMENSION type.
//     const strategies = dimensionStrategyFactory.getStrategy(dimensionType);

//     // Build the usage validation context.
//     const usageContext: JournalEntryDimensionContext = {
//       dimensionData,
//       line,
//       lineNumber: context.lineNumber,
//       ledgerCode: context.ledgerCode,
//     };

//     // Execute each validation strategy for this dimension.
//     for (const strategy of strategies) {
//       await strategy.validateExistingDimension(usageContext);
//     }
//   }
// }
