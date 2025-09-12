import { Injectable } from '@nestjs/common';
import { FiscalYear, Prisma, SalesOrderType, SiteGroupings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseSequenceNumber } from '../types/common.types';
import { createDateRange, YearMonth } from '../utils/date.utils';
import { LocalMenus } from '../utils/enums/local-menu';

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

interface RawLedgersFromDb {
  LED_0: string;
  LED_1: string;
  LED_2: string;
  LED_3: string;
  LED_4: string;
  LED_5: string;
  LED_6: string;
  LED_7: string;
  LED_8: string;
  LED_9: string;
}

@Injectable()
export class CommonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca o tipo de encomenda de venda
   * @param orderType Tipo de encomenda
   * @param legislation Legislação
   * @returns O objeto SalesOrderType encontrado ou null se não existir.
   */
  async getSalesOrderType(orderType: string, legislation: string): Promise<SalesOrderType | null> {
    try {
      return await this.prisma.salesOrderType.findUnique({
        where: { orderType_legislation: { orderType, legislation } },
      });
    } catch (error) {
      console.error('Erro ao buscar tipo de encomenda de venda:', error);
      throw new Error('Could not fetch the sales order type.');
    }
  }

  /**
   * Retorna o sequence number para o tipo de encomenda de venda informada
   * @param orderType Tipo de encomenda
   * @returns O sequence number ou null se não encontrado.
   */
  async getSalesOrderTypeSequenceNumber(orderType: string): Promise<string | null> {
    try {
      const orderTypeObj = await this.getSalesOrderType(orderType, '');

      return orderTypeObj?.sequenceNumber ?? null;
    } catch (error) {
      console.error('Erro ao buscar o contador para o tipo de encomenda de venda:', error);
      throw new Error('Could not fetch the sequence number for the sales order type.');
    }
  }

  /**
   * Retorna o sequence number para o tipo de encomenda de compra informada
   * @returns O sequence number ou null se não encontrado.
   */
  async getPurchaseOrderTypeSequenceNumber(): Promise<PurchaseSequenceNumber[]> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      return [];
    }

    try {
      const results: PurchaseSequenceNumber[] = await this.prisma.$queryRaw<PurchaseSequenceNumber[]>(
        Prisma.sql`
          SELECT LEG_0 as legislation, CODNUM_2 as 'counter' FROM ${Prisma.raw(dbSchema)}.TABCOUAFF WHERE MODULE_0 = 6
        `,
      );

      return results.length > 0 ? results : [];
    } catch (error) {
      console.error('Erro ao buscar o contador para o tipo de encomenda de compra:', error);
      throw new Error('Could not fetch the sequence number for the purchase order.');
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
      throw new Error('Database schema configuration missing.');
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
      throw new Error(`Could not fetch dimensions for transaction ${transaction}.`);
    }
  }

  /**
   * Verifica de se o grupo de empresas existe
   * @param code - O código do grupo de empresas a ser verificado.
   * @returns `true` se o grupo de empresas existir, `false` caso contrário.
   */
  async companyGroupExists(code: string): Promise<boolean> {
    const count = await this.prisma.siteGroupings.count({
      where: { group: code },
    });
    return count > 0;
  }

  /**
   * Busca grupo de empresas
   * @param groupId ID do grupo
   * @returns O grupo de empresas ou null se não encontrado.
   */
  async getGroupByCode(groupId: string): Promise<SiteGroupings | null> {
    try {
      return await this.prisma.siteGroupings.findUnique({
        where: { group: groupId },
      });
    } catch (error) {
      console.error('Erro ao buscar grupo de empresas:', error);
      throw new Error('Could not fetch the site group.');
    }
  }

  /**
   * Check if a tax code exists
   * @param taxCode - The tax code to check.
   * @param legislation - The legislation associated with the tax code.
   * @returns Return true if the tax code exists, false otherwise.
   */
  async taxCodeExists(taxCode: string, legislation: string): Promise<boolean> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    try {
      const result: { count: bigint }[] = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT COUNT(1) as count FROM ${Prisma.raw(dbSchema)}.TABVAT
          WHERE VAT_0 = ${taxCode} AND LEG_0 = ${legislation}
        `,
      );

      if (!result || result.length === 0) {
        return false;
      }

      const countRecord = Number(result[0].count);

      return countRecord > 0;
    } catch (error) {
      console.error('Erro ao buscar dados da taxa:', error);
      throw new Error('Tax code not found.');
    }
  }

  /**
   * Get the fiscal year code for a given company, ledger type, and year.
   * @param company - Company code
   * @param ledgerType - Ledger type
   * @param year - Current year (ex: 2025)
   * @returns The found FiscalYear object or null if it doesn't exist.
   */
  async getFiscalYear(company: string, ledgerType: LocalMenus.LedgerType, year: number): Promise<FiscalYear | null> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    try {
      return await this.prisma.fiscalYear.findFirst({
        where: {
          company,
          ledgerTypeNumber: ledgerType,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });
    } catch (error) {
      console.error('Erro ao buscar FiscalYear:', error);
      throw new Error('Could not fetch the FiscalYear.');
    }
  }

  /**
   * Get the period code for a given fiscal year and date.
   * @param company - Company code
   * @param ledgerType - Ledger type
   * @param fiscalYear - Fiscal year code
   * @param yearMonth - Year and month to find the period for
   * @returns The found period code or null if it doesn't exist.
   */
  async getPeriod(
    company: string,
    ledgerType: LocalMenus.LedgerType,
    fiscalYear: number,
    yearMonth: YearMonth,
  ): Promise<number | null> {
    const { startDate, endDate } = createDateRange(yearMonth);

    try {
      const fiscalPeriod = await this.prisma.period.findFirst({
        where: {
          company: company,
          ledgerTypeNumber: ledgerType,
          fiscalYear: fiscalYear,
          startDate: { lte: startDate },
          endDate: { gte: endDate },
        },
      });

      return fiscalPeriod?.code ?? null;
    } catch (error) {
      console.error('Erro ao buscar o código do período:', error);
      throw new Error('Could not fetch the period code.');
    }
  }
}
