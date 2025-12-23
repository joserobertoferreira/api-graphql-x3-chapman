/**
 * Helper para criar uma cláusula OR para busca case-insensitive em um campo.
 * @param field - O nome do campo no modelo Prisma.
 * @param value - O termo de busca.
 * @param operator - O operador do Prisma a ser usado (ex: 'equals', 'contains').
 */
export function caseInsensitiveOrCondition(
  field: string,
  value: string | string[],
  operator: 'equals' | 'contains' | 'in' = 'equals',
) {
  if (operator === 'in') {
    if (!Array.isArray(value)) {
      console.warn(`Operator 'in' used with non-array term for field '${field}'.`);
      return {};
    }

    const searchVariations = value.flatMap((item) => {
      const searchTerm = item.trim();
      return [
        searchTerm.toUpperCase(),
        searchTerm.toLowerCase(),
        searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
      ];
    });

    return { [field]: { in: searchVariations } };
  } else {
    if (typeof value !== 'string') {
      console.warn(`Operator '${operator}' used with non-string term for field '${field}'.`);
      return {};
    }

    const searchTerm = value.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    return {
      OR: searchVariations.map((variation) => ({
        [field]: { [operator]: variation },
      })),
    };
  }
}
