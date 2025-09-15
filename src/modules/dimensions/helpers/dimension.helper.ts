import { DimensionEntity } from '../../../common/types/dimension.types';

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
