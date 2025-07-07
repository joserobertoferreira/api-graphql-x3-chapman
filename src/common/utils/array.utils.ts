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
