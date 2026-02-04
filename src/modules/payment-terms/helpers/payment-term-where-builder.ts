import { Prisma } from '../../../generated/prisma/client';
import { PaymentTermFilterInput } from '../dto/filter-payment-term.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de termos de pagamento.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.PaymentTermWhereInput` pronto para ser usado.
 */
export function buildPaymentTermWhereClause(filter?: PaymentTermFilterInput): Prisma.PaymentTermWhereInput {
  if (!filter) {
    return {};
  }

  const where: Prisma.PaymentTermWhereInput = {};
  const andConditions: Prisma.PaymentTermWhereInput[] = [];

  if (filter.code_equals) {
    andConditions.push({ code: { equals: filter.code_equals } });
  }

  if (filter.legislation_equals) {
    andConditions.push({ legislation: { equals: filter.legislation_equals } });
  }

  if (filter.description_contains) {
    andConditions.push({ labels: { contains: filter.description_contains } });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
