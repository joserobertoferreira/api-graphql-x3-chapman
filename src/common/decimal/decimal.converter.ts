import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class DecimalConverter {
  /**
   * Converte string para Prisma.Decimal com fallback seguro
   */
  toDecimal(value: string | null | undefined, fallback: string = '0'): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value ?? fallback);
    } catch (error) {
      return new Prisma.Decimal(fallback);
    }
  }

  /**
   * Converte Decimal para string (seguro para null/undefined)
   */
  toString(value: Prisma.Decimal | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return value.toString();
  }

  /**
   * Valida se a string pode ser convertida
   */
  isValid(value: string): boolean {
    try {
      new Prisma.Decimal(value);
      return true;
    } catch {
      return false;
    }
  }

  format(value: Prisma.Decimal, decimalPlaces = 2): string {
    return value.toDecimalPlaces(decimalPlaces).toString();
  }

  calculatePercentage(value: Prisma.Decimal, percentage: string): Prisma.Decimal {
    const percent = this.toDecimal(percentage);
    return value.mul(percent.div(100));
  }
}
