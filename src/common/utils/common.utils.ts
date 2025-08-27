/**
 * Formata um número para uma string de um comprimento específico,
 * preenchendo com zeros à esquerda.
 *
 * @param num - O número a ser formatado.
 * @param targetLength - O comprimento final desejado da string (padrão: 8).
 * @returns A string formatada.
 *
 * @example
 * // Retorna "00000123"
 * formatNumberWithLeadingZeros(123);
 *
 * @example
 * // Retorna "00123456"
 * formatNumberWithLeadingZeros(123456);
 */
export function formatNumberWithLeadingZeros(num: number, targetLength: number = 8): string {
  // 1. Converte o número para uma string.
  const numString = String(num);

  // 2. Usa padStart para adicionar '0' no início até atingir o comprimento desejado.
  return numString.padStart(targetLength, '0');
}
