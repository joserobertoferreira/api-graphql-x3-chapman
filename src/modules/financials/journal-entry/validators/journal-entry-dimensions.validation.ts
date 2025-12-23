import { BadRequestException } from '@nestjs/common';
import { DimensionsInput } from 'src/common/inputs/dimension.input';
import { DimensionsEntity, DimensionTypeConfig, LineValidateDimensionContext } from 'src/common/types/dimension.types';
import { Dimensions } from 'src/generated/prisma/client';
import { DimensionService } from '../../../dimensions/dimension.service';
import { executeDimensionStrategiesForLine } from '../../../dimensions/helpers/dimension.helper';
import { DimensionStrategyFactory } from '../../../dimensions/strategies/dimension-strategy.factory';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';

/**
 * Validates a single journal entry line against the business rules of dimensions.
 * @param line - The journal entry line to validate.
 * @param dimensionEntity - The dimension entities associated with the line.
 * @param dimensionNames - A map of dimension type codes to their names.
 * @param dimensionTypesMap - A map of dimension type codes to their configurations.
 * @param dimensionsDataMap - A map of pre-fetched dimension data.
 * @param dimensionService - The DimensionService instance for additional operations.
 * @param dimensionStrategyFactory - The factory to create dimension strategies.
 * @param context - Additional context including line number and ledger code.
 * @throws BadRequestException if any validation rule is violated.
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
): Promise<JournalEntryLineInput> {
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

  const cleanedDimensions: DimensionsInput = {};
  for (const [typeCode, value] of providedDimensions.entries()) {
    // Need to find the field name (e.g., 'fixture') from the typeCode (e.g., 'FIX')
    const fieldName = dimensionNames.get(typeCode);
    if (fieldName) {
      (cleanedDimensions as any)[fieldName] = value;
    }
  }

  return { ...line, dimensions: cleanedDimensions };
}
