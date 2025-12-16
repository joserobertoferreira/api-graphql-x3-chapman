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

/**
 * Counts how many properties in an object have a non-empty value.
 * @param obj - The object to check.
 * @param property - The base name of the properties to check (e.g., "dimension" to check "dimension1", "dimension2", etc.).
 * @param dimension - The number of properties to check (e.g., 20 to check "dimension1" through "dimension20").
 * @returns The number of properties with a value.
 */
export function countNonEmptyProperties(obj: { [key: string]: any }, property: string, dimension: number = 1): number {
  let count = 0;

  for (let i = 1; i <= dimension; i++) {
    // Build the key name dynamically (ex: "dimension1", "dimension2").
    const key = `${property}${i}`;

    // Get the value of the property.
    const value = obj[key];

    // Check if the value is a string and if, after removing whitespace, it is not empty.
    if (typeof value === 'string' && value.trim() !== '') {
      // If the condition is true, increment the counter.
      count++;
    }
  }

  // Return the final count.
  return count;
}

/**
 * Converts a string, array or an object into upper case.
 * Safely handles empty, null, or undefined values.
 * @param value - The string, array or object to convert.
 * @param keys - Optional array of keys to convert in an object. If not provided, all keys will be converted.
 * @returns The uppercased string, array or object, or an empty string if the input is invalid.
 */
export function toUpperCase(value: any, keys?: string[]): any {
  // Keep guard for null, undefined, or non-string values
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.toUpperCase();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toUpperCase(item, keys));
  }

  if (typeof value === 'object') {
    const newObj = { ...value };
    if (keys && keys.length > 0) {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(newObj, key) && typeof newObj[key] === 'string') {
          newObj[key] = newObj[key].toUpperCase();
        }
      }
    }
    return newObj;
  }

  // If it's not a string, array, or object, return it as is
  return value;
}
