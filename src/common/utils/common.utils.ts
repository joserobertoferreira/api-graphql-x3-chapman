import * as validator from 'validator';

/**
 * Formats a number as a string of a specific length, padding with leading zeros.
 *
 * @param num - The number to format.
 * @param targetLength - The desired final length of the string (default: 8).
 * @returns The formatted string.
 *
 * @example
 * // Returns "00000123"
 * formatNumberWithLeadingZeros(123);
 *
 * @example
 * // Returns "00123456"
 * formatNumberWithLeadingZeros(123456);
 */
export function formatNumberWithLeadingZeros(num: number, targetLength: number = 8): string {
  // Converts the number to a string.
  const numString = String(num);

  // Uses padStart to add '0' at the beginning until the desired length is reached.
  return numString.padStart(targetLength, '0');
}

/**
 * Checks if the provided string is a valid email address.
 *
 * @param email - The string to validate.
 * @returns `true` if the string is a valid email, `false` otherwise.
 */
export function isEmailValid(email: string | null | undefined): boolean {
  // Check if the email is a non-empty string.
  // 'validator.isEmail' returns true for an empty string, so this check is important.
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return false;
  }

  // Use the validator library to check the format.
  return validator.isEmail(email);
}

/**
 * Capitalizes a string (first letter uppercase, rest lowercase).
 * Safely handles empty, null, or undefined strings.
 * @param str - The string to capitalize.
 * @returns The capitalized string, or an empty string if the input is invalid.
 */
export function capitalize(str: string | null | undefined): string {
  // Keep guard for null, undefined, or non-string values
  if (!str || typeof str !== 'string') {
    return '';
  }

  // Get the first letter and capitalize it
  const firstLetter = str.charAt(0).toUpperCase();

  // Gets the rest of the string (from the second character onward) and converts it to lowercase
  const restOfString = str.slice(1).toLowerCase();

  // Put them together and return
  return `${firstLetter}${restOfString}`;
}
