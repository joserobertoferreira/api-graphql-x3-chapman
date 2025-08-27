/**
 * Consolida múltiplos argumentos de string em um array, removendo quaisquer
 * valores que sejam null, undefined ou strings compostas apenas por espaços em branco.
 *
 * @param lines - Um número variável de argumentos que podem ser string, null ou undefined.
 * @returns Um array de strings contendo apenas os valores válidos e não vazios.
 *
 * @example
 * // Retorna ['Linha 1', 'Linha 3']
 * stringsToArray('Linha 1', null, '  ', 'Linha 3', undefined);
 *
 * @example
 * // Retorna []
 * stringsToArray(null, undefined, ' ');
 */
export function stringsToArray(...lines: (string | null | undefined)[]): string[] {
  return lines.filter((line): line is string => typeof line === 'string' && line.trim() !== '');
}

/**
 * Mapeia um array de dimensões para um objeto de payload com campos dimensionTypeN e dimensionN.
 * Campos faltantes são preenchidos com null até o máximo de dimensões especificado.
 * @param dimensions - Array de objetos contendo typeCode e value para cada dimensão.
 * @param maxDimensions - Número máximo de dimensões a serem mapeadas (padrão é 7).
 * @returns Objeto com campos dimensionTypeN e dimensionN.
 */
export function mapDimensionsToPayload(
  dimensions: Array<{ typeCode: string; value: string }>,
  maxDimensions: number = 7,
): Record<string, string | null> {
  const payload: Record<string, string | null> = {};

  // Preencher com dados existentes
  dimensions.slice(0, maxDimensions).forEach((dimension, index) => {
    payload[`dimensionType${index + 1}`] = dimension.typeCode;
    payload[`dimension${index + 1}`] = dimension.value;
  });

  // Preencher campos faltantes com ''
  for (let i = dimensions.length; i < maxDimensions; i++) {
    payload[`dimensionType${i + 1}`] = '';
    payload[`dimension${i + 1}`] = '';
  }

  return payload;
}
