import { DEFAULT_LEGACY_DATE } from '../../common/types/common.types';

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

/**
 * Verifica se uma data está dentro de um intervalo de validade,
 * tratando uma data final específica como "infinita".
 *
 * @param checkDate - A data a ser validada.
 * @param validFrom - A data de início da validade.
 * @param validTo - A data de fim da validade.
 * @returns `true` se a data for válida, `false` caso contrário.
 */
export function isDateInRange(checkDate: Date, validFrom: Date, validTo: Date): boolean {
  // Condição 1: A data deve ser maior ou igual à data de início ---
  const isAfterFrom = checkDate >= validFrom;

  // Condição 2: Lógica para a data de fim ---
  let isBeforeTo: boolean;

  if (validTo === DEFAULT_LEGACY_DATE) {
    isBeforeTo = true;
  } else {
    isBeforeTo = checkDate <= validTo;
  }

  // A data é válida se AMBAS as condições forem verdadeiras.
  return isAfterFrom && isBeforeTo;
}
