import { DEFAULT_LEGACY_DATE } from '../types/common.types';

export interface YearMonth {
  year: number;
  month: number;
}

/**
 * Format a date to the format DD/MM/YY.
 * @param date - Date to be formatted.
 * @returns The formatted date as a string.
 */
export function formatDateToDDMMYY(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexado
  const year = date.getUTCFullYear().toString().slice(-2); // Pega os 2 últimos dígitos
  return `${day}/${month}/${year}`;
}

/**
 * Checks if a date is within a validity range, treating a specific end date as "infinite".
 *
 * @param checkDate - The date to validate.
 * @param validFrom - The start date of the validity.
 * @param validTo - The end date of the validity.
 * @returns `true` if the date is valid, `false` otherwise.
 */
export function isDateInRange(checkDate: Date, validFrom: Date, validTo: Date): boolean {
  // Convert to timestamp
  const checkDateTimestamp = checkDate.getTime();
  const validFromTimestamp = validFrom.getTime();
  const validToTimestamp = validTo.getTime();
  const defaultLegacyTimestamp = DEFAULT_LEGACY_DATE.getTime();

  // Condition 1: The date must be greater than or equal to the start date
  const isAfterFrom = checkDateTimestamp >= validFromTimestamp;

  // Condition 2: LLogic for the end date
  let isBeforeTo: boolean;

  if (validToTimestamp === defaultLegacyTimestamp) {
    isBeforeTo = true;
  } else {
    isBeforeTo = checkDateTimestamp <= validToTimestamp;
  }

  // The date is valid if BOTH conditions are true.
  return isAfterFrom && isBeforeTo;
}

/**
 * Checks if the range defined by two dates is valid.
 * A range is considered valid if the start date is less than or equal to the end date.
 * If the end date is equal to the default legacy date (31/12/9999), it is treated as "infinite" and the range is always valid.
 * If the end date is not provided, it defaults to the legacy date.
 *
 * @param validFrom - The start date of the range.
 * @param validTo - The end date of the range (optional).
 * @returns `true` if the range is valid, `false` otherwise.
 */
export function isDateRangeValid(validFrom: Date, validTo?: Date): boolean {
  const validFromTimestamp = validFrom.getTime();
  const validToDate = validTo ?? DEFAULT_LEGACY_DATE;
  const validToTimestamp = validToDate.getTime();
  const defaultLegacyTimestamp = DEFAULT_LEGACY_DATE.getTime();

  // If the end date is the default legacy date, treat it as "infinite"
  if (validToTimestamp === defaultLegacyTimestamp) {
    return true;
  }
  return validFromTimestamp <= validToTimestamp;
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

/**
 * Tries to parse a date string in multiple formats and returns a Date object if valid.
 * Supported formats: YYYYMMDD, DDMMYYYY, YYYY-MM-DD, DD-MM-YYYY
 * @param dateStr - The date string to parse.
 * @returns A Date object if valid, otherwise null.
 */
export function convertStringToDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Remove spaces
  const str = dateStr.trim();

  // YYYYMMDD
  const yyyymmdd = /^(\d{4})(\d{2})(\d{2})$/;
  // DDMMYYYY
  const ddmmyyyy = /^(\d{2})(\d{2})(\d{4})$/;
  // YYYY-MM-DD
  const yyyymmddDash = /^(\d{4})-(\d{2})-(\d{2})$/;
  // DD-MM-YYYY
  const ddmmyyyyDash = /^(\d{2})-(\d{2})-(\d{4})$/;

  let year: number, month: number, day: number;

  if (yyyymmdd.test(str)) {
    const [, y, m, d] = str.match(yyyymmdd)!;
    year = +y;
    month = +m;
    day = +d;
  } else if (ddmmyyyy.test(str)) {
    const [, d, m, y] = str.match(ddmmyyyy)!;
    year = +y;
    month = +m;
    day = +d;
  } else if (yyyymmddDash.test(str)) {
    const [, y, m, d] = str.match(yyyymmddDash)!;
    year = +y;
    month = +m;
    day = +d;
  } else if (ddmmyyyyDash.test(str)) {
    const [, d, m, y] = str.match(ddmmyyyyDash)!;
    year = +y;
    month = +m;
    day = +d;
  } else {
    return null;
  }

  // Month in JS Date is 0-indexed
  const date = new Date(Date.UTC(year, month - 1, day));
  // Validate date
  if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
    return date;
  }
  return null;
}
