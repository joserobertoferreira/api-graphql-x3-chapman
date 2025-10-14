import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from 'src/common/helpers/case-insensitive.helper';
import { UserFilter } from '../dto/filter-user.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de utilizadores.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.UserWhereInput` pronto para ser usado.
 */
export function buildUserWhereClause(filter?: UserFilter): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    isActive: 2,
  };

  if (!filter) {
    return where;
  }

  // Combinações de filtros
  const conditions: Prisma.UserWhereInput[] = [];

  // Filtro de Nome (Case-Insensitive simulado)
  if (filter.name_contains) {
    conditions.push(caseInsensitiveOrCondition('name', filter.name_contains.trim(), 'contains'));
  }

  if (filter.code_equals) {
    conditions.push({ code: { equals: filter.code_equals.trim() } });
  }

  if (filter.email_contains) {
    conditions.push(caseInsensitiveOrCondition('email', filter.email_contains.trim(), 'contains'));
  }

  // Se houver condições, adiciona ao 'where' principal
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
