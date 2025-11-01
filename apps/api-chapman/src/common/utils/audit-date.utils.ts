import { parse as uuidParse, v4 as uuidv4 } from 'uuid';

/**
 * Interface for the return object of the getAuditTimestamps function.
 */
export interface AuditTimestamps {
  /**
   * A complete Date object, representing the exact point in time (date and time).
   * Ideal for DATETIME fields.
   */
  dateTime: Date;
  /**
   * A string in ISO format 'YYYY-MM-DD', representing only the date.
   * Ideal for DATE fields.
   */
  date: Date;

  /**
   * Total number of seconds since midnight (00:00:00) for the date.
   * Useful for systems that require time as seconds offset from the start of the day.
   */
  timeInSeconds: number;
}

/**
 * Generates consistent timestamps for auditing operations.
 * Returns both a complete Date object (for datetime fields) and an ISO date string
 * 'YYYY-MM-DD' (for date-only fields).
 *
 * @returns {AuditTimestamps} An object containing the current date, datetime and time in seconds.
 */
export function getAuditTimestamps(): AuditTimestamps {
  const now = new Date();

  // Create a new Date object representing the start of the day (midnight) in UTC
  const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return {
    dateTime: now,
    date: startOfDayUTC,
    timeInSeconds: getSeconds(now),
  };
}

/**
 * Calculates the total number of seconds since midnight (00:00:00) in UTC
 * for a given Date object.
 * Using UTC ensures that the result is consistent and independent of the server's timezone.
 *
 * @param date - The Date object to be converted.
 * @returns The number of seconds since midnight UTC.
 */
export function getSeconds(date: Date): number {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Generates a UUID v4 and returns it as a 16-byte Buffer,
 * compatible with Prisma's `Bytes` type and SQL Server's `uniqueidentifier`/`binary(16)`.
 *
 * @returns {Buffer} A 16-byte Buffer representing the UUID.
 */
export function generateUUIDBuffer(): Buffer {
  // 1. Generate a standard UUID as a string (e.g., 'f8a4a5b0-3b9c-4e4a-9e1e-2b0a1b9b0a1b')
  const uuidString = uuidv4();

  // 2. Convert the UUID string to its byte representation (an array of 16 numbers)
  const uuidBytes = uuidParse(uuidString);

  // 3. Create a Node.js Buffer from the byte array
  const buffer = Buffer.from(uuidBytes);

  return buffer;
}

/**
 * Returns the date of the end of the current century (December 31st of the last year of the century).
 *
 * Example: If the current year is 2023, it will return December 31, 2099.
 *
 * @returns {Date} The date representing the end of the current century.
 */
export function getGreatestValidDate(): Date {
  const currentYear = new Date().getFullYear();
  const centuryStartYear = Math.floor((currentYear - 1) / 100) * 100 + 1;
  const centuryEndYear = centuryStartYear + 99;

  return new Date(centuryEndYear, 11, 31); // mês 11 = dezembro (0-indexado)
}
