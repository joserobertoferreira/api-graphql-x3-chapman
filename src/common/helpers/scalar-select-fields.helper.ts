import { Prisma } from '@prisma/client';

/**
 * Create a Prisma object 'select' with all scalar fields of a given model,
 * with the option to exclude fields by default.
 *
 * @param modelName - Prisma model name (ex: 'Dimensions').
 * @param options - Options for creating the select.
 * @param options.exclude - An array of strings or regular expressions to exclude fields.
 * @returns A 'select' object with the filtered scalar fields set to 'true'.
 */
export function createSelectScalars(
  modelName: string,
  options?: { exclude?: (string | RegExp)[] },
): { [key: string]: true } {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);

  if (!model) {
    throw new Error(`Model "${modelName}" not found in Prisma DMMF.`);
  }

  const allScalarFieldNames = model.fields.filter((field) => field.kind === 'scalar').map((field) => field.name);

  // If there are no exclusions, return all fields.
  if (!options?.exclude || options.exclude.length === 0) {
    return allScalarFieldNames.reduce(
      (acc, fieldName) => {
        acc[fieldName] = true;
        return acc;
      },
      {} as { [key: string]: true },
    );
  }

  // --- FILTERING LOGIC ---
  const exclusionPatterns = options.exclude;

  const filteredFieldNames = allScalarFieldNames.filter((fieldName) => {
    // Check if the field name matches any exclusion pattern.
    // 'some' to stop as soon as a match is found.
    const shouldExclude = exclusionPatterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(fieldName); // Test with the regular expression
      }
      return pattern === fieldName; // Test with the exact string
    });
    // Return true only if the field should NOT be excluded.
    return !shouldExclude;
  });

  // Build the 'select' object with the filtered fields.
  return filteredFieldNames.reduce(
    (acc, fieldName) => {
      acc[fieldName] = true;
      return acc;
    },
    {} as { [key: string]: true },
  );
}
