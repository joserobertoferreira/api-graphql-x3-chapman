import { Prisma } from '@prisma/client';

/**
 * Converte string para Prisma.Decimal com fallback seguro
 */
export function convertToDecimal(value: string | null | undefined, fallback: string = '0'): Prisma.Decimal {
  try {
    return new Prisma.Decimal(value ?? fallback);
  } catch (error) {
    return new Prisma.Decimal(fallback);
  }
}

/**
 * Converte Decimal para string (seguro para null/undefined)
 */
export function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

/**
 * Valida se a string pode ser convertida
 */
export function decimalConverterIsValid(value: string): boolean {
  try {
    new Prisma.Decimal(value);
    return true;
  } catch {
    return false;
  }
}
