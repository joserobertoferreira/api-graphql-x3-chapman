import { BadRequestException } from '@nestjs/common';
import { Dimensions } from 'src/generated/prisma';
import {
  DimensionsEntity,
  DimensionTypeConfig,
  LineValidateDimensionContext,
} from '../../../common/types/dimension.types';
import { DimensionService } from '../../dimensions/dimension.service';
import { executeDimensionStrategiesForLine } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';

/**
 * Validates a single journal entry line against the business rules of dimensions.
 */
export async function validateDimensionRules(
  line: JournalEntryLineInput,
  dimensionEntity: DimensionsEntity[],
  dimensionNames: Map<string, string>,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionService: DimensionService,
  dimensionStrategyFactory: DimensionStrategyFactory,
  context: { lineNumber: number; ledgerCode: string },
): Promise<void> {
  const { lineNumber, ledgerCode } = context;

  const { requiredDimensions, providedDimensions } = dimensionService.getRequiredDimensions(
    lineNumber,
    ledgerCode,
    line.dimensions || {},
    dimensionEntity,
    dimensionNames,
    dimensionTypesMap,
    `for account ${line.account}`,
  );

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
        dimensionNames,
        providedDimensions, // Map of {type -> value} for the dimensions on this line,
        dimensionsDataMap, // Map of pre-fetched dimension data
        dimensionStrategyFactory, // The factory
        { line: line, lineNumber: lineNumber, ledgerCode: ledgerCode },
        (dimensionData, ctx) => {
          const usageContext: LineValidateDimensionContext = {
            dimensionData: dimensionData,
            isIntercompany: false,
            lineNumber: ctx.lineNumber,
            ledgerCode: ctx.ledgerCode,
            journalLine: line,
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
