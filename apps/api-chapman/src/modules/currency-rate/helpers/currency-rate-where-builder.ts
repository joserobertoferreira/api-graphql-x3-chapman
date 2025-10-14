import { Prisma } from '@prisma/client';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { CurrencyRateFilterInput } from '../dto/filter-currency-rate.input';

const gqlEnumToLocalMenu: Record<ExchangeRateTypeGQL, LocalMenus.ExchangeRateType> = {
  [ExchangeRateTypeGQL.dailyRate]: LocalMenus.ExchangeRateType.DAILY_RATE,
  [ExchangeRateTypeGQL.monthlyRate]: LocalMenus.ExchangeRateType.MONTHLY_RATE,
  [ExchangeRateTypeGQL.averageRate]: LocalMenus.ExchangeRateType.AVERAGE_RATE,
  [ExchangeRateTypeGQL.customsDocFileExchange]: LocalMenus.ExchangeRateType.CUSTOMS_DOC_FILE_EXCHANGE,
};

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de taxas de conversão.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.CurrencyRateTableWhereInput` pronto para ser usado.
 */
export function buildCurrencyRateWhereClause(filter?: CurrencyRateFilterInput): Prisma.CurrencyRateTableWhereInput {
  if (!filter) {
    return {};
  }

  // Construção do `where`
  const where: Prisma.CurrencyRateTableWhereInput = {};
  const andConditions: Prisma.CurrencyRateTableWhereInput[] = [];

  const gqlRateType = filter.rateType_equals;
  const rateTypeNumber = gqlEnumToLocalMenu[gqlRateType];

  andConditions.push({ rateType: { equals: rateTypeNumber } });

  andConditions.push({ rateDate: { equals: filter.rateDate_equals } });

  andConditions.push({ sourceCurrency: { equals: filter.sourceCurrency_equals } });

  // if (filter.rateDate_gte || filter.rateDate_lte) {
  //   const dateFilter: Prisma.DateTimeFilter = {};

  //   if (filter.rateDate_gte) {
  //     // Garante que a data de início comece à meia-noite
  //     const startDate = new Date(filter.rateDate_gte);
  //     startDate.setUTCHours(0, 0, 0, 0);
  //     dateFilter.gte = startDate;
  //   }

  //   if (filter.rateDate_lte) {
  //     // Garante que a data de fim vá até o último milissegundo do dia
  //     const endDate = new Date(filter.rateDate_lte);
  //     endDate.setUTCHours(23, 59, 59, 999);
  //     dateFilter.lte = endDate;
  //   }

  //   andConditions.push({ rateDate: dateFilter });
  // }

  if (filter.destinationCurrency_in) {
    andConditions.push({
      destinationCurrency: { in: filter.destinationCurrency_in.map((item) => item.toUpperCase()) },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
