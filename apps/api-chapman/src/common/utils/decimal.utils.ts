import { Prisma } from '@prisma/client';

interface TotalOptions<T> {
  ignoreInvalid?: boolean; // Se true, ignora valores inválidos ao somar
  multiplier?: boolean;
  multiplierKey?: keyof T;
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
export function isAllowedConvertToDecimal(value: string): boolean {
  try {
    new Prisma.Decimal(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converte um valor para uma instância segura de Decimal.
 * @param value - O valor a ser convertido (Decimal, número, string, null, ou undefined).
 * @param fallback - O valor a ser usado se a conversão falhar.
 * @returns Uma instância de Decimal, se for um valor inválido retorna 0.
 */
export function toDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
  fallback: number | string = 0,
): Prisma.Decimal {
  if (value instanceof Prisma.Decimal && value.isFinite()) {
    return value;
  }

  // Se for nulo ou undefined, usa o fallback imediatamente.
  if (value === null || value === undefined) {
    return new Prisma.Decimal(fallback);
  }

  try {
    const d = new Prisma.Decimal(value);
    return d.isFinite() ? d : new Prisma.Decimal(fallback);
  } catch {
    return new Prisma.Decimal(fallback);
  }
}

/**
 * Faz a soma da chave informada de um array de objetos.
 * @param array - O array de objetos a ser somado.
 * @param key - A chave do objeto que será somada.
 * @param options Opções adicionais para a soma.
 * @returns A soma dos valores da chave especificada, ou 0 se o array estiver vazio ou a chave não existir.
 */
export function totalValuesByKey<T>(array: T[], key: keyof T, options: TotalOptions<T> = {}): Prisma.Decimal {
  const { ignoreInvalid = false, multiplier = false, multiplierKey } = options;

  // Se o modo de multiplicação está ativo, a chave do multiplicador é obrigatória.
  if (multiplier && !multiplierKey) {
    throw new Error('The "multiplierKey" option is required when "multiplier" is true.');
  }

  return array.reduce((sum: Prisma.Decimal, item, index) => {
    const value = item[key];

    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Prisma.Decimal)) {
      if (ignoreInvalid) return sum;
      throw new Error(`Value for key "${String(key)}" is undefined or null at index ${index}.`);
    }

    try {
      const decimalValue = toDecimal(value);

      if (multiplier) {
        if (multiplierKey === undefined) {
          if (ignoreInvalid) return sum;
          throw new Error(`Multiplier key is undefined at item index ${index}.`);
        }
        const multiplyBy = item[multiplierKey];

        if (multiplyBy === undefined || multiplyBy === null) {
          if (ignoreInvalid) return sum;
          throw new Error(`Multiplier value missing for key "${String(multiplierKey)}" at item index ${index}.`);
        }

        const multiplyByNormalized = toDecimal(multiplyBy as any);
        const product = decimalValue.mul(multiplyByNormalized);

        return sum.add(product);
      } else {
        return sum.add(decimalValue);
      }
    } catch (error) {
      if (ignoreInvalid) return sum;

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Conversion error at item index ${index} for key "${String(key)}": ${errorMessage}`);
    }
  }, new Prisma.Decimal(0));
}
