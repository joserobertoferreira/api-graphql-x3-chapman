import { DEFAULT_LEGACY_DATE } from '../types/common.types';

export interface YearMonth {
  year: number;
  month: number;
}

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
  // Converter as datas para timestamp
  const checkDateTimestamp = checkDate.getTime();
  const validFromTimestamp = validFrom.getTime();
  const validToTimestamp = validTo.getTime();
  const defaultLegacyTimestamp = DEFAULT_LEGACY_DATE.getTime();

  // Condição 1: A data deve ser maior ou igual à data de início
  const isAfterFrom = checkDateTimestamp >= validFromTimestamp;

  // Condição 2: Lógica para a data de fim
  let isBeforeTo: boolean;

  if (validToTimestamp === defaultLegacyTimestamp) {
    isBeforeTo = true;
  } else {
    isBeforeTo = checkDateTimestamp <= validToTimestamp;
  }

  // A data é válida se AMBAS as condições forem verdadeiras.
  return isAfterFrom && isBeforeTo;
}

/**
 * Return the year and month from a given date.
 * @param date - The date to extract year and month from.
 * @returns An object containing the year and month.
 */
export function getYearAndMonth(date: Date): YearMonth {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

/**
 * Create a range of dates from a year and month.
 * @param yearMonth - An object containing the year and month.
 * @returns An object containing the start and end dates of the month.
 */
export function createDateRange(yearMonth: YearMonth): { startDate: Date; endDate: Date } {
  const { year, month } = yearMonth;

  // Start date is the first day of the month
  const startDate = new Date(Date.UTC(year, month - 1, 1));

  // End date is the last day of the month
  const endDate = new Date(Date.UTC(year, month, 0)); // Day 0 of next month is last day of current month

  return { startDate, endDate };
}
