import { BadRequestException } from '@nestjs/common';
import {
  DimensionsEntity,
  DimensionTypeConfig,
  LineValidateDimensionContext,
} from '../../../common/types/dimension.types';
import { Dimensions } from '../../../generated/prisma';
import { DimensionService } from '../../dimensions/dimension.service';
import { executeDimensionStrategiesForLine } from '../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { IntercompanyJournalEntryLineInput } from '../dto/create-intercompany-journal-entry-line.input';

/**
 * Validates a single journal entry line against the business rules of dimensions.
 */
export async function validateDimensionRules(
  line: IntercompanyJournalEntryLineInput,
  dimensionEntity: DimensionsEntity[],
  dimensionNames: Map<string, string>,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionService: DimensionService,
  dimensionStrategyFactory: DimensionStrategyFactory,
  // context: { lineNumber: number; ledgerCode: string; siteCompanyMap: Map<string, JournalEntryCompanySiteInfo> },
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
            isIntercompany: true,
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
