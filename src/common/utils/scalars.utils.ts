import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { ASTNode, Kind } from 'graphql';

@Scalar('Decimal')
export class DecimalScalar implements CustomScalar<string | null, Prisma.Decimal | null> {
  description = 'Decimal custom scalar type for Prisma.Decimal.';

  // Converte o valor do backend (Prisma.Decimal) para o cliente (string)
  serialize(value: Prisma.Decimal | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (!(value instanceof Prisma.Decimal)) {
      throw new Error('DecimalScalar can only serialize Decimal values');
    }
    return value.toString();
  }

  // Converte o valor do input da query (variáveis) para o backend
  public parseValue(value: string | null): Prisma.Decimal | null {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return new Prisma.Decimal(value);
    } catch (error) {
      throw new Error('Invalid Decimal value');
    }
  }

  // Converte o valor do input da query (inline na string da query) para o backend
  parseLiteral(ast: ASTNode): Prisma.Decimal | null {
    if (ast.kind === Kind.NULL) {
      return null;
    }
    if (ast.kind !== Kind.STRING) {
      throw new Error('[DecimalScalar] Can only parse string values');
    }
    try {
      return new Prisma.Decimal(ast.value);
    } catch (error) {
      throw new Error(`[DecimalScalar] Invalid decimal value: ${ast.value}`);
    }
  }
}
