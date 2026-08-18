import { CustomScalar, Scalar } from '@nestjs/graphql';
import { ASTNode, Kind } from 'graphql';
import { PaymentApprovalTypeGQL } from 'src/common/registers/enum-register';
import { Prisma } from 'src/generated/prisma/client';
import { PaymentApprovalTypeToPaymentApprovalTypeGQL } from './enums/convert-enum';

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error(`[DecimalScalar] Invalid decimal value: ${ast.value}`);
    }
  }
}

function parsePaymentApprovalType(value: unknown): PaymentApprovalTypeGQL {
  if (typeof value === 'number') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const gqlValue = PaymentApprovalTypeToPaymentApprovalTypeGQL[value];
    if (!gqlValue) {
      throw new Error(`[PaymentApprovalTypeInputScalar] Invalid LocalMenus 510 code: ${value}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return gqlValue;
  }

  if (typeof value === 'string' && Object.values(PaymentApprovalTypeGQL).includes(value as PaymentApprovalTypeGQL)) {
    return value as PaymentApprovalTypeGQL;
  }

  throw new Error(
    `[PaymentApprovalTypeInputScalar] Value must be a PaymentApprovalType enum name or its LocalMenus 510 numeric code, got: ${JSON.stringify(value)}`,
  );
}

// Accepts either the PaymentApprovalType enum name (e.g. from the web client) or its
// X3 local menu 510 numeric code (e.g. from the Excel add-in), resolving both to the GQL enum.
@Scalar('PaymentApprovalTypeInput')
export class PaymentApprovalTypeInputScalar implements CustomScalar<number | string, PaymentApprovalTypeGQL> {
  description =
    'Payment approval type. Accepts the PaymentApprovalType enum name or its X3 local menu 510 numeric code.';

  serialize(value: PaymentApprovalTypeGQL): string {
    return value;
  }

  parseValue(value: number | string): PaymentApprovalTypeGQL {
    return parsePaymentApprovalType(value);
  }

  parseLiteral(ast: ASTNode): PaymentApprovalTypeGQL {
    if (ast.kind === Kind.STRING || ast.kind === Kind.ENUM) {
      return parsePaymentApprovalType(ast.value);
    }
    if (ast.kind === Kind.INT) {
      return parsePaymentApprovalType(Number(ast.value));
    }
    throw new Error('[PaymentApprovalTypeInputScalar] Can only parse string, enum or int values');
  }
}
