/**
 * Formatar uma data para o formato DD/MM/YY.
 * @param date - A data a ser formatada.
 * @returns A data formatada como uma string.
 */
export function formatDateToDDMMYY(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexado
  const year = date.getUTCFullYear().toString().slice(-2); // Pega os 2 últimos dígitos
  return `${day}/${month}/${year}`;
}
