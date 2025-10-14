/**
 * Filters an 'input' object, keeping only the keys that exist in a Prisma model.
 * @param input - The source object to be filtered.
 * @param modelKeys - An array with the valid field names of the model.
 * @param removeKeys - An array with the field names will not be in the result, even if they exist in the model.
 * @returns A new object containing only the valid properties.
 */
export function filterByPrismaModel<T>(input: any, modelKeys: (keyof T)[], removeKeys?: string[]): Partial<T> {
  const validKeys = new Set(modelKeys as string[]);

  const defaultToRemove = new Set([
    'UPDTICK_0',
    'exportNumber',
    'createUser',
    'createDate',
    'createDatetime',
    'updateDate',
    'updateDatetime',
    'updateUser',
    'singleID',
    'ROWID',
  ]);

  const keysToRemove = new Set([...defaultToRemove, ...(removeKeys || [])]);

  const result: Partial<T> = {};

  for (const key of Object.keys(input)) {
    if (validKeys.has(key as string) && !keysToRemove.has(key as string)) {
      (result as any)[key] = input[key as string];
    }
  }

  return result;
}
