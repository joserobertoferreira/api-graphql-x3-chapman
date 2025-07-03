/**
 * Simula uma busca case-insensitive para uma lista de strings, gerando uma cláusula OR.
 * @param field - O nome do campo no modelo do Prisma (ex: 'city', 'country').
 * @param values - O array de strings para buscar.
 * @returns Um objeto de condição OR para o Prisma.
 */
export function caseInsensitiveOrCondition(field: string, values: string[]) {
  const variations = values.flatMap((value) => [
    { [field]: { equals: value.trim().toUpperCase() } },
    { [field]: { equals: value.trim().toLowerCase() } },
    { [field]: { equals: value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase() } },
  ]);
  return { OR: variations };
}
