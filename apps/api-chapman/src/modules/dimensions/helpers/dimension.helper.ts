import { Dimensions, Prisma } from '@prisma/client';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { AccountService } from '../../../common/services/account.service';
import { LedgerPlanCode, Ledgers } from '../../../common/types/common.types';
import { DimensionEntity, DimensionTypeConfig, OrderAnalyticalPayload } from '../../../common/types/dimension.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { DimensionStrategyFactory } from '../strategies/dimension-strategy.factory';
import { BaseValidateDimensionContext, DimensionValidationStrategy } from '../strategies/dimension-strategy.interface';
import { mapDimensionFields } from './dimension-mapper';

/**
 * Creates a Dimension Entity object based on the provided object,
 * from which information from the provided fields will be extracted.
 * @param obj - Object containing dimension data.
 * @param dimensionTypeField - Field name of dimension type code (eg. dimensionType).
 * @param dimension - Number representing the dimension (1-20).
 * @param dimensionField - (Optional) Field name of dimension code (eg. dimension).
 * @returns An array of DimensionEntity objects, with valid pairs.
 */
export function buildDimensionEntity(
  obj: Record<string, any>,
  dimensionTypeField: string,
  dimension: number,
  dimensionField?: string,
): DimensionEntity[] {
  const results: DimensionEntity[] = [];

  for (let i = 1; i <= dimension; i++) {
    const typeCode = obj[`${dimensionTypeField}${i}`];

    // Get only if the value is a valid string and not empty
    if (typeCode && typeof typeCode === 'string' && typeCode.trim() !== '') {
      const entry: DimensionEntity = { dimensionType: typeCode.trim() };

      // If dimensionField is provided, get the corresponding dimension value
      if (dimensionField) {
        const dimCode = obj[`${dimensionField}${i}`];

        // Add dimension even if it's an empty string
        entry.dimension = typeof dimCode === 'string' ? dimCode.trim() : undefined;
      }

      results.push(entry);
    }
  }

  return results;
}

// /**
//  * Create a dimension setup for validations.
//  * This function prepares a map of dimension types to their configurations,
//  * marking which dimensions are mandatory based on company settings.
//  * @param dimensionTypesMap - Map of dimension type codes to their configurations.
//  * @param company - Company object containing dimension settings.
//  */
// export function prepareDimensionTypesMap(
//   dimensionTypesMap: Map<string, DimensionTypeConfig>,
//   company: { [key: string]: any },
// ): void {
//   // Collect all dimensions provided in the lines for validation.
//   const allDimensions = new Map<string, { dimensionType: string; dimension: string }>();
//   for (const line of lines) {
//     if (line.dimensions) {
//       for (const [field, config] of dimensionTypesMap.entries()) {
//         if (line.dimensions[field]) {
//           const value = line.dimensions[field];
//           const type = config.code;
//           const key = `${type}|${value}`;

//           if (!allDimensions.has(key)) {
//             allDimensions.set(key, { dimensionType: type, dimension: value });
//           }
//         }
//       }
//     }
//   }
// }

/**
 * Helper function to determine if a dimension is mandatory
 * @param type - The code of the dimension type to check.
 * @param map - Map of dimension type codes to their configurations.
 * @returns True if the dimension is mandatory, false otherwise.
 */
export function mandatoryDimension(
  type: string,
  map: Map<string, DimensionTypeConfig>,
): DimensionTypeConfig | undefined {
  for (const config of map.values()) {
    if (config.code === type) return config;
  }
  return undefined;
}

/**
 * Executes a set of validation strategies for a given map of dimensions.
 * This function is generic and can be used in different business contexts (journal entries, sales orders, etc.).
 *
 * @param T - The type of the specific "context" object that will be constructed.
 * @param C - The type of the context passed to each strategy (must extend BaseValidateDimensionContext).
 *
 * @param providedDimensionsMap - A map of {type -> value} for the dimensions on this line.
 * @param dimensionsDataMap - A map containing the pre-fetched data for all dimensions.
 * @param dimensionStrategyFactory - The factory to get the validation strategies.
 * @param buildContextFn - A function provided by the caller to build the specific context for each dimension.
 */
export async function executeDimensionStrategiesForLine<T, C extends BaseValidateDimensionContext>(
  providedDimensionsMap: Map<string, string>,
  dimensionsDataMap: Map<string, Dimensions>,
  dimensionStrategyFactory: DimensionStrategyFactory,
  context: T,
  buildContextFn: (dimensionData: Dimensions, context: T) => C,
): Promise<void> {
  let generalExecuted = false;

  // Iterate over the dimensions that were PROVIDED for this line.
  for (const [dimensionType, dimensionValue] of providedDimensionsMap.entries()) {
    // Fetch the pre-loaded data for this dimension.
    const dimensionData = dimensionsDataMap.get(`${dimensionType}|${dimensionValue}`);
    if (!dimensionData) {
      throw new Error(`Internal inconsistency: Dimension data for ${dimensionType}|${dimensionValue} not pre-loaded.`);
    }

    // Get the validation strategies for this DIMENSION type.
    const validationStrategies = dimensionStrategyFactory.getStrategy(dimensionType);

    const existsGeneral = validationStrategies.some((s) => s.name === 'GeneralDimensionStrategy');

    let strategies: DimensionValidationStrategy[] = validationStrategies;

    if (existsGeneral && generalExecuted) {
      // Filter strategies if General was already executed
      strategies = validationStrategies.filter((s) => s.name !== 'GeneralDimensionStrategy');

      // If no strategies remain after filtering, skip this dimension
      if (strategies.length === 0) {
        continue;
      }
    }

    // Update flag AFTER processing (if General exists in current strategies)
    if (existsGeneral && !generalExecuted) {
      generalExecuted = true;
    }

    // Build the usage validation context.
    const usageContext = buildContextFn(dimensionData, context);

    // Execute each validation strategy for this dimension.
    for (const strategy of strategies) {
      await strategy.validateExistingDimension(usageContext);
    }
  }
}

/**
 * Build a payload object for order analytical dimensions.
 * @param abbreviation - Abbreviation for the order type (e.g., 'SOP' for Sales Order, 'POP' for Purchase Order).
 * @param dimensions - Map of dimension type codes to their values.
 * @param dimensionsMap - order line dimensions.
 * @param dimensionTypesMap - Map of dimension type codes to their configurations.
 * @param accountService - Service to fetch account-related data.
 * @returns An object containing the dimension fields for the order line.
 */
export async function buildAnalyticalDimensionsPayload(
  abbreviation: string,
  dimensions: DimensionsInput,
  ledgers: Ledgers,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  accountService: AccountService,
): Promise<OrderAnalyticalPayload> {
  const dimensionsFields = mapDimensionFields(dimensions, dimensionTypesMap);

  const timestamps = getAuditTimestamps();
  const analyticalUUID = generateUUIDBuffer();

  const fixedAnalyticalData: Partial<Prisma.AnalyticalAccountingLinesCreateInput> = {
    abbreviation: abbreviation,
    sortValue: 1,
    ...dimensionsFields,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: analyticalUUID,
  };

  const ledgerFields: { [key: string]: string } = {};
  const chartFields: { [key: string]: string } = {};

  const planCodes: LedgerPlanCode[] = await accountService.getPlanCodes(ledgers);

  const ledgerMap = new Map<string, string>(planCodes.map((row) => [row.code, row.planCode]));

  // Agora preenchemos os objetos ledgerFields e chartFields
  for (let i = 0; i < ledgers.ledgers.length; i++) {
    const ledgerCode = ledgers.ledgers[i];
    const planCode = ledgerMap.get(ledgerCode);

    ledgerFields[`ledger${i + 1}`] = ledgerCode ?? '';
    chartFields[`chartCode${i + 1}`] = planCode ?? '';
  }

  const payload: OrderAnalyticalPayload = {
    fixedAnalyticalData,
    ledgerFields,
    chartFields,
  };

  return payload;
}
