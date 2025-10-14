import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_LEGACY_DATE, RateCurrency, TabRatCurRecord, TabRatVatRecord } from '../types/common.types';
import { getGreatestValidDate } from '../utils/audit-date.utils';

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new Error('Database schema configuration missing.');
    }

    console.log('Buscar taxa de IVA para o código:', vatCode, 'e data de referência:', referenceDate);

    let lastReadVatRate: Decimal | null = null;

    // Para garantir que estamos a comparar apenas a parte da data
    // e evitar problemas com fuso horário/horas, convertemos referenceDate para o início do dia em UTC.
    const refDateStartOfDay = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()),
    );

    try {
      const results: TabRatVatRecord[] = await this.prisma.$queryRaw<TabRatVatRecord[]>(
        Prisma.sql`
          SELECT VAT_0 as tax, STRDAT_0 as validFrom, VATRAT_0 as rate, CPY_0 as company, LEG_0 as legislation
          FROM ${Prisma.raw(dbSchema)}.TABRATVAT
          WHERE VAT_0 = ${vatCode}
          ORDER BY VAT_0, LEG_0, CPY_0, STRDAT_0
        `,
      );

      if (results.length === 0) {
        return null;
      }

      let testDate: Date | null = null;

      for (const record of results) {
        lastReadVatRate = new Decimal(record.rate); // Guardar sempre a última taxa lida

        // Normalizar validFrom para o início do dia em UTC para comparação consistente
        const recordValidFromStartOfDay = new Date(
          Date.UTC(record.validFrom.getUTCFullYear(), record.validFrom.getUTCMonth(), record.validFrom.getUTCDate()),
        );

        if (testDate === null) {
          testDate = recordValidFromStartOfDay;
        } else {
          if (refDateStartOfDay >= testDate && refDateStartOfDay < recordValidFromStartOfDay) {
            return {
              tax: record.tax,
              legislation: record.legislation,
              company: record.company,
              validFrom: testDate,
              rate: lastReadVatRate,
            };
          } else {
            testDate = recordValidFromStartOfDay;
          }
        }
      }
      return {
        tax: results[0].tax,
        legislation: results[0].legislation,
        company: results[0].company,
        validFrom: testDate ?? results[0].validFrom,
        rate: lastReadVatRate ?? new Decimal(0),
      };
    } catch (error) {
      console.error('Erro ao buscar ou processar taxas de IVA:', error);
      throw error;
    }
  }

  /**
   * Recuperação da taxa entre uma moeda destination e a moeda da empresa
   * @param euro código da moeda
   * @param organizationCurrency Moeda da empresa
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
      throw new Error('Database schema configuration missing.');
    }

    const reference_date = referenceDate === null ? getGreatestValidDate() : referenceDate;
    const rate_type = rateType === null || rateType === 0 ? 1 : rateType;

    let returnRate: RateCurrency = { rate: new Decimal(1), divisor: new Decimal(1), status: 0 };

    if (organizationCurrency === euro) {
      try {
        const currencyInfo: TabRatCurRecord = await this.getCurrency(destinationCurrency);

        if (currencyInfo.euroFlag === 0) {
          return { rate: new Decimal(1), divisor: new Decimal(1), status: 3 };
        }

        if (
          currencyInfo.euroFlag === 2 &&
          (currencyInfo.euroChangeOverDate === DEFAULT_LEGACY_DATE || currencyInfo.euroChangeOverDate <= reference_date)
        ) {
          returnRate.rate = currencyInfo.euroRate.equals(0) ? new Decimal(1) : currencyInfo.euroRate;
          returnRate.divisor = new Decimal(1);
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

        if (currencyInfo.euroFlag === 0) {
          return { rate: new Decimal(1), status: 2 };
        }

        if (
          currencyInfo.euroFlag === 2 &&
          (currencyInfo.euroChangeOverDate === DEFAULT_LEGACY_DATE || currencyInfo.euroChangeOverDate <= reference_date)
        ) {
          if (currencyInfo.euroRate.equals(0)) {
            returnRate.rate = currencyInfo.euroRate.equals(0)
              ? new Decimal(1)
              : new Decimal(1).div(currencyInfo.euroRate);
            returnRate.divisor = new Decimal(1);
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

        if (orgCurrencyInfo.euroFlag === 0) return { rate: new Decimal(1), status: 2 };
        if (orgCurrencyInfo.currency !== destCurrencyInfo.currency && destCurrencyInfo.euroFlag === 0)
          return { rate: new Decimal(1), divisor: new Decimal(1), status: 3 };

        let organizationRate: RateCurrency = { rate: new Decimal(1), status: 0 };
        let destinationRate: RateCurrency = { rate: new Decimal(1), status: 0 };

        if (orgCurrencyInfo.currency === destCurrencyInfo.currency) {
          returnRate.rate = orgCurrencyInfo.euroRate.equals(0)
            ? new Decimal(1)
            : destCurrencyInfo.euroRate.div(orgCurrencyInfo.euroRate);
          returnRate.divisor = new Decimal(1);
          returnRate.status = 1;
          return returnRate;
        }

        if (
          orgCurrencyInfo.euroFlag === 2 &&
          (orgCurrencyInfo.euroChangeOverDate === DEFAULT_LEGACY_DATE ||
            orgCurrencyInfo.euroChangeOverDate <= reference_date)
        ) {
          const checkRate = await this.getCurrencyRateByType(rate_type, destinationCurrency, euro, reference_date);

          organizationRate = {
            rate: orgCurrencyInfo.euroRate.equals(0) ? new Decimal(1) : checkRate.rate.div(orgCurrencyInfo.euroRate),
            divisor: new Decimal(1),
            status: checkRate.status,
          };
        }

        if (
          destCurrencyInfo.euroFlag === 2 &&
          (destCurrencyInfo.euroChangeOverDate === DEFAULT_LEGACY_DATE ||
            destCurrencyInfo.euroChangeOverDate <= reference_date)
        ) {
          const checkRate = await this.getCurrencyRateByType(rate_type, euro, organizationCurrency, reference_date);

          destinationRate = {
            rate: destCurrencyInfo.euroRate.equals(0) ? new Decimal(1) : checkRate.rate.mul(destCurrencyInfo.euroRate),
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
            const checkRate = await this.getCurrencyRateByType(rate_type, euro, organizationCurrency, reference_date);

            if (checkRate.status === 0) {
              const cours = checkRate.rate;

              const checkRate1 = await this.getCurrencyRateByType(rateType, destinationCurrency, euro, referenceDate);

              if (checkRate1.status === 0) {
                returnRate.rate = cours.mul(checkRate1.rate);
                returnRate.status = checkRate1.status;
              }
            }
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
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    try {
      const results: TabRatCurRecord[] = await this.prisma.$queryRaw<TabRatCurRecord[]>(
        Prisma.sql`
          SELECT TOP 1 CUR_0 as currency, EURFLG_0 as euroFlag, EURRAT_0 as euroRate,
          EURDAT_0 as euroChangeOverDate
          FROM ${Prisma.raw(dbSchema)}.TABCUR
          WHERE CUR_0 = ${currency}
        `,
      );

      if (results.length > 0) {
        return results[0];
      } else {
        return {
          currency: '',
          euroFlag: 0,
          euroRate: new Decimal(0),
          euroChangeOverDate: new Date('1753-01-01'),
        };
      }
    } catch (error) {
      console.error('Erro ao buscar dados da moeda:', error);
      throw new Error('Could not fetch currency data.');
    }
  }

  /**
   * Check if a currency exists
   * @param currency - The currency code to check.
   * @returns Return true if the currency exists, false otherwise.
   */
  async currencyExists(currency: string): Promise<boolean> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    try {
      const result: { count: number } = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(1) as count FROM ${Prisma.raw(dbSchema)}.TABCUR WHERE CUR_0 = ${currency}
        `,
      );

      if (!result) {
        return false;
      }

      return result[0].count > 0;
    } catch (error) {
      console.error('Erro ao buscar dados da moeda:', error);
      throw new Error('Currency not found.');
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
    sourceCurrency: string,
    destinationCurrency: string,
    referenceDate: Date,
  ): Promise<RateCurrency> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    let rateCurrency: RateCurrency = { rate: new Decimal(1), divisor: new Decimal(1), status: 1 };

    try {
      const result = await this.prisma.currencyRateTable.findFirst({
        where: {
          rateType,
          sourceCurrency,
          destinationCurrency,
          rateDate: {
            lte: referenceDate,
          },
        },
        orderBy: [{ rateType: 'asc' }, { sourceCurrency: 'asc' }, { destinationCurrency: 'asc' }, { rateDate: 'desc' }],
      });

      if (!result) {
        console.warn('Nenhuma taxa de câmbio encontrada para os critérios especificados.');
        return rateCurrency;
      }

      const rate = result.inverseRate;
      const divisor = result.divisor ?? 1; // Garantir que divisor não seja zero
      const value = new Decimal(divisor).div(rate).toDecimalPlaces(10, Decimal.ROUND_HALF_UP);

      rateCurrency.rate = value;
      rateCurrency.divisor = divisor;
      rateCurrency.status = 0;

      return rateCurrency;
    } catch (error) {
      console.error('Erro ao buscar taxa de câmbio:', error);
      return rateCurrency;
    }
  }
}
