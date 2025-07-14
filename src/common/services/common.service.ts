import { Injectable } from '@nestjs/common';
import { OrderType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_LEGACY_DATE, Ledgers, RateCurrency, TabRatCurRecord, TabRatVatRecord } from '../types/common.types';
import { getGreatestValidDate } from '../utils/audit-date.utils';

type AnalyticalEntryWhereInput = Prisma.AnalyticEntryTransactionsWhereInput;
type AnalyticalEntrySelect = {
  tableAbbreviation: true;
  transaction: true;
  dimensionType: true;
};
type AnalyticalEntry = {
  tableAbbreviation: string;
  transaction: string;
  dimensionType: string;
};

@Injectable()
export class CommonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca o tipo de ordem
   * @param orderType Tipo de ordem
   * @param legislation Legislação
   * @returns O objeto OrderType encontrado ou null se não existir.
   */
  async getSalesOrderType(orderType: string, legislation: string): Promise<OrderType | null> {
    try {
      return await this.prisma.orderType.findUnique({
        where: { orderType_legislation: { orderType, legislation } },
      });
    } catch (error) {
      console.error('Erro ao buscar tipo de ordem:', error);
      throw new Error('Não foi possível buscar o tipo de ordem.');
    }
  }

  /**
   * Retorna o sequence number para o tipo de ordem informado
   * @param orderType Tipo de ordem
   * @returns O sequence number ou null se não encontrado.
   */
  async getSalesOrderTypeSequenceNumber(orderType: string): Promise<string | null> {
    console.log('Buscando sequence number para o tipo de ordem:', orderType);
    try {
      const orderTypeObj = await this.getSalesOrderType(orderType, '');

      return orderTypeObj?.sequenceNumber ?? null;
    } catch (error) {
      console.error('Erro ao buscar o contador para o tipo de ordem:', error);
      throw new Error('Não foi possível buscar o contador para o tipo de ordem.');
    }
  }

  /**
   * Retorna os dados do referencial
   * @param companyId ID da empresa
   * @returns Lista com os dados do referencial ou uma lista vazia se não encontrado.
   */
  async getLedgers(companyId: string): Promise<Ledgers[]> {
    console.log('Buscar dados do referencial para a empresa:', companyId);

    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      return [];
    }

    try {
      const results: Ledgers[] = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT LED_0,LED_1,LED_2,LED_3,LED_4,LED_5,LED_6,LED_7,LED_8,LED_9
          FROM ${Prisma.raw(dbSchema)}.GACM WHERE GCM_0= ${companyId}
        `,
      );

      return results.length > 0 ? results : [];
    } catch (error) {
      console.error('Erro ao buscar dados do referencial:', error);
      return [];
    }
  }

  /**
   * Retorna o plano de contas para o referencial informado
   * @param ledger Referencial
   * @returns O código do plano ou null se não encontrado.
   */
  async getChartCode(ledger: string): Promise<string | null> {
    console.log('Buscar plano de contas para o referencial:', ledger);

    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      return null;
    }

    try {
      const results: { COA_0: string }[] = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT COA_0 FROM ${Prisma.raw(dbSchema)}.GLED WHERE LED_0 = ${ledger}`,
      );

      return results[0]?.COA_0 ?? null;
    } catch (error) {
      console.error('Erro ao buscar plano de contas do referencial:', error);
      return null;
    }
  }

  /**
   * Retorna uma lista de planos de contas para a lista de referenciais informados
   * @param ledgers Lista de referenciais
   * @returns Lista de códigos de planos ou uma lista vazia se não encontrado.
   */
  async getChartCodes(ledgers: Ledgers[]): Promise<string[]> {
    console.log('Buscar planos de contas para os referenciais:', ledgers);
    if (ledgers.length === 0) return [];

    const ledgerProperties = Object.keys({} as Ledgers) as Array<keyof Ledgers>;

    try {
      const allPromises = ledgers.flatMap((ledger) =>
        ledgerProperties.map(async (property) => {
          const ledgerValue = ledger[property];
          return ledgerValue ? await this.getChartCode(ledgerValue) : null;
        }),
      );

      const chartCodes = await Promise.all(allPromises);
      return chartCodes.filter((code): code is string => !!code);
    } catch (error) {
      console.error('Erro ao buscar planos de contas dos referenciais:', error);
      return [];
    }
  }

  /**
   * Encontra a taxa de IVA (VATRAT_0) aplicável para uma determinada chave e data de referência.
   *
   * @param vatCode - O código do IVA (VAT_0).
   * @param referenceDate - A data para a qual a taxa deve ser encontrada.
   * @returns A taxa de IVA (VATRAT_0) aplicável ou null se nenhuma for encontrada.
   */
  async getTaxRate(vatCode: string, referenceDate: Date): Promise<TabRatVatRecord | null> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Configuração de schema do banco de dados em falta.');
    }

    console.log('Buscando taxa de IVA para o código:', vatCode, 'e data de referência:', referenceDate);

    let lastReadVatRate: Decimal | null = null;

    // Para garantir que estamos a comparar apenas a parte da data
    // e evitar problemas com fuso horário/horas, convertemos referenceDate para o início do dia em UTC.
    const refDateStartOfDay = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()),
    );

    try {
      const results: TabRatVatRecord[] = await this.prisma.$queryRaw<TabRatVatRecord[]>(
        Prisma.sql`
          SELECT VAT_0, STRDAT_0, VATRAT_0
          FROM ${Prisma.raw(dbSchema)}.TABRATVAT
          WHERE VAT_0 = ${vatCode}
          ORDER BY VAT_0, LEG_0, CPY_0, STRDAT_0
        `,
      );

      console.log('Resultados da consulta de taxas de IVA:', results);

      if (results.length === 0) {
        return null;
      }

      let testDate: Date | null = null;

      for (const record of results) {
        lastReadVatRate = new Decimal(record.VATRAT_0); // Guardar sempre a última taxa lida

        // Normalizar STRDAT_0 para o início do dia em UTC para comparação consistente
        const recordStrDatStartOfDay = new Date(
          Date.UTC(record.STRDAT_0.getUTCFullYear(), record.STRDAT_0.getUTCMonth(), record.STRDAT_0.getUTCDate()),
        );

        if (testDate === null) {
          testDate = recordStrDatStartOfDay;
        } else {
          if (refDateStartOfDay >= testDate && refDateStartOfDay < recordStrDatStartOfDay) {
            return {
              VAT_0: record.VAT_0,
              STRDAT_0: testDate,
              VATRAT_0: lastReadVatRate,
            };
          } else {
            testDate = recordStrDatStartOfDay;
          }
        }
      }
      return {
        VAT_0: results[0].VAT_0,
        STRDAT_0: testDate ?? results[0].STRDAT_0,
        VATRAT_0: lastReadVatRate ?? new Decimal(0),
      };
    } catch (error) {
      console.error('Erro ao buscar ou processar taxas de IVA:', error);
      throw error;
    }
  }

  /**
   * Recuperação da taxa entre uma moeda destination e a moeda da empresa
   * @param euro código da moeda
   * @param organizationCurrency Moeda da empresa)
   * @param destinationCurrency Moeda destino
   * @param rateType Tipo de câmbio
   * @param referenceDate Data de referência
   * @returns A taxa de câmbio ou null se não encontrado.
   */
  async getCurrencyRate(
    euro: string,
    organizationCurrency: string,
    destinationCurrency: string,
    rateType: number,
    referenceDate: Date,
  ): Promise<RateCurrency> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Configuração de schema do banco de dados em falta.');
    }

    const reference_date = referenceDate === null ? getGreatestValidDate() : referenceDate;
    const rate_type = rateType === null || rateType === 0 ? 1 : rateType;

    // const FLEURO = true;
    // let NO_CUR_RATE = 0;

    let returnRate: RateCurrency = { rate: new Decimal(1), status: 0 };

    if (organizationCurrency === euro) {
      try {
        const currencyInfo: TabRatCurRecord = await this.getCurrency(destinationCurrency);

        if (currencyInfo.EURFLG_0 === 0) {
          return { rate: new Decimal(1), status: 3 };
        }

        if (
          currencyInfo.EURFLG_0 === 2 &&
          (currencyInfo.EURDAT_0 === DEFAULT_LEGACY_DATE || currencyInfo.EURDAT_0 <= reference_date)
        ) {
          returnRate.rate = currencyInfo.EURRAT_0.equals(0) ? new Decimal(1) : currencyInfo.EURRAT_0;
          returnRate.status = 1;
        } else {
          returnRate = await this.getCurrencyRateByType(rate_type, destinationCurrency, euro, reference_date);
        }
      } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        return returnRate;
      }
    } else if (destinationCurrency === euro) {
      try {
        const currencyInfo: TabRatCurRecord = await this.getCurrency(organizationCurrency);

        if (currencyInfo.EURFLG_0 === 0) {
          return { rate: new Decimal(1), status: 2 };
        }

        if (
          currencyInfo.EURFLG_0 === 2 &&
          (currencyInfo.EURDAT_0 === DEFAULT_LEGACY_DATE || currencyInfo.EURDAT_0 <= reference_date)
        ) {
          if (currencyInfo.EURRAT_0.equals(0)) {
            returnRate.rate = currencyInfo.EURRAT_0.equals(0)
              ? new Decimal(1)
              : new Decimal(1).div(currencyInfo.EURRAT_0);
            returnRate.status = 1;
          }
        } else {
          returnRate = await this.getCurrencyRateByType(rate_type, euro, organizationCurrency, reference_date);
        }
      } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        return returnRate;
      }
    } else {
      try {
        const orgCurrencyInfo: TabRatCurRecord = await this.getCurrency(organizationCurrency);
        const destCurrencyInfo: TabRatCurRecord = await this.getCurrency(destinationCurrency);

        if (orgCurrencyInfo.EURFLG_0 === 0) return { rate: new Decimal(1), status: 2 };
        if (orgCurrencyInfo.CUR_0 !== destCurrencyInfo.CUR_0 && destCurrencyInfo.EURFLG_0 === 0)
          return { rate: new Decimal(1), status: 3 };

        let organizationRate: RateCurrency = { rate: new Decimal(1), status: 0 };
        let destinationRate: RateCurrency = { rate: new Decimal(1), status: 0 };

        if (orgCurrencyInfo.CUR_0 === destCurrencyInfo.CUR_0) {
          returnRate.rate = orgCurrencyInfo.EURRAT_0.equals(0)
            ? new Decimal(1)
            : destCurrencyInfo.EURRAT_0.div(orgCurrencyInfo.EURRAT_0);
          returnRate.status = 1;
          return returnRate;
        }

        if (
          orgCurrencyInfo.EURFLG_0 === 2 &&
          (orgCurrencyInfo.EURDAT_0 === DEFAULT_LEGACY_DATE || orgCurrencyInfo.EURDAT_0 <= reference_date)
        ) {
          const checkRate = await this.getCurrencyRateByType(rate_type, destinationCurrency, euro, reference_date);

          organizationRate = {
            rate: orgCurrencyInfo.EURRAT_0.equals(0) ? new Decimal(1) : checkRate.rate.div(orgCurrencyInfo.EURRAT_0),
            status: checkRate.status,
          };
        }

        if (
          destCurrencyInfo.EURFLG_0 === 2 &&
          (destCurrencyInfo.EURDAT_0 === DEFAULT_LEGACY_DATE || destCurrencyInfo.EURDAT_0 <= reference_date)
        ) {
          const checkRate = await this.getCurrencyRateByType(rate_type, euro, organizationCurrency, reference_date);

          destinationRate = {
            rate: destCurrencyInfo.EURRAT_0.equals(0) ? new Decimal(1) : checkRate.rate.mul(destCurrencyInfo.EURRAT_0),
            status: checkRate.status,
          };
        }

        if (organizationRate.status === 0 && destinationRate.status === 0) {
          const checkRate = await this.getCurrencyRateByType(
            rate_type,
            destinationCurrency,
            organizationCurrency,
            reference_date,
          );

          if (checkRate.status !== 0) {
            // if (FLEURO) {
            //   NO_CUR_RATE = 1;
            const checkRate = await this.getCurrencyRateByType(rate_type, euro, organizationCurrency, reference_date);

            if (checkRate.status === 0) {
              const cours = checkRate.rate;

              const checkRate1 = await this.getCurrencyRateByType(rateType, destinationCurrency, euro, referenceDate);

              if (checkRate1.status === 0) {
                returnRate.rate = cours.mul(checkRate1.rate);
                returnRate.status = checkRate1.status;
              }
            }
            // }
          } else {
            returnRate.rate = checkRate.rate;
            returnRate.status = checkRate.status;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        return returnRate;
      }
    }

    return returnRate;
  }

  /**
   * Retorna os dados da moeda informada
   * @param currency Código da moeda
   * @returns O objeto de moeda encontrado ou null se não existir.
   */
  async getCurrency(currency: string): Promise<TabRatCurRecord> {
    console.log('Buscando dados da moeda:', currency);

    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Configuração de schema do banco de dados em falta.');
    }

    try {
      const results: TabRatCurRecord[] = await this.prisma.$queryRaw<TabRatCurRecord[]>(
        Prisma.sql`
          SELECT TOP 1 CUR_0, EURFLG_0, EURRAT_0, EURDAT_0
          FROM ${Prisma.raw(dbSchema)}.TABCUR
          WHERE CUR_0 = ${currency}
        `,
      );

      return results.length > 0
        ? results[0]
        : {
            CUR_0: '',
            EURFLG_0: 0,
            EURRAT_0: new Decimal(0),
            EURDAT_0: new Date(0),
          };
    } catch (error) {
      console.error('Erro ao buscar dados da moeda:', error);
      throw new Error('Não foi possível buscar os dados da moeda.');
    }
  }

  /**
   * Busca o câmbio de uma moeda para outra
   * @param rateType Tipo de câmbio
   * @param destinationCurrency Moeda destino
   * @param currency Moeda de origem
   * @param referenceDate Data de referência
   * @returns A taxa de câmbio ou null se não encontrado.
   */
  async getCurrencyRateByType(
    rateType: number,
    destinationCurrency: string,
    currency: string,
    referenceDate: Date,
  ): Promise<RateCurrency> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Configuração de schema do banco de dados em falta.');
    }

    let rateCurrency: RateCurrency = { rate: new Decimal(1), status: 1 };

    try {
      const result = await this.prisma.currencyRateTable.findFirst({
        where: {
          rateType,
          destinationCurrency,
          currency,
          rateDate: {
            lte: referenceDate,
          },
        },
        orderBy: [{ rateType: 'asc' }, { destinationCurrency: 'asc' }, { currency: 'asc' }, { rateDate: 'desc' }],
      });

      if (!result) {
        console.warn('Nenhuma taxa de câmbio encontrada para os critérios especificados.');
        return rateCurrency;
      }

      const reverse = result.reverse;
      const divisor = result.divisor ?? 1; // Garantir que divisor não seja zero
      const value = new Decimal(divisor).div(reverse).toDecimalPlaces(9, Decimal.ROUND_HALF_UP);

      rateCurrency.rate = value;
      rateCurrency.status = 0;

      return rateCurrency;
    } catch (error) {
      console.error('Erro ao buscar taxa de câmbio:', error);
      return rateCurrency;
    }
  }

  /**
   * Busca o nome do país pelo código
   * @param countryCode Código do país
   * @returns O nome do país ou null se não encontrado.
   */
  async getCountryNameByCode(countryCode: string): Promise<string | null> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Configuração de schema do banco de dados em falta.');
    }

    try {
      const results: { CRYDES_0: string }[] = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT CRYDES_0 FROM ${Prisma.raw(dbSchema)}.ZVWCOUNTRY WHERE CRY_0 = ${countryCode}`,
      );

      return results[0]?.CRYDES_0 ?? null;
    } catch (error) {
      console.error('Erro ao buscar plano de contas do referencial:', error);
      return null;
    }
  }

  /**
   * Busca dados da transação de registo analítico
   * @tableAbbreviation Abreviação da tabela
   * @transaction ID da transação
   * @returns Dados da transação ou null se não encontrado.
   */
  async getAnalyticalTransactionData(args: AnalyticalEntryWhereInput): Promise<AnalyticalEntry[] | null> {
    const { tableAbbreviation, transaction } = args;
    const select: AnalyticalEntrySelect = {
      tableAbbreviation: true,
      transaction: true,
      dimensionType: true,
    };

    try {
      const entries = await this.prisma.analyticEntryTransactions.findMany({
        where: { tableAbbreviation: tableAbbreviation, transaction: transaction },
        select: select,
      });
      return entries.length > 0 ? entries : null;
    } catch (error) {
      console.error('Erro ao buscar dimensões da transação:', error);
      throw new Error(`Não foi possível buscar as dimensões para a transação ${transaction}.`);
    }
  }
}
