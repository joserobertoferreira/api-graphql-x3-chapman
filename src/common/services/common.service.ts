import { Injectable } from '@nestjs/common';
import { FiscalYear, Prisma, SalesOrderType, SiteGroups } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticalEntry,
  AnalyticalEntrySelect,
  AnalyticalEntryWhereInput,
  FindMiscellaneousTableArgs,
  FindTaxCodesArgs,
  MiscellaneousResult,
  PurchaseSequenceNumber,
  SequenceArgs,
} from '../types/common.types';
import { createDateRange, YearMonth } from '../utils/date.utils';
import { LocalMenus } from '../utils/enums/local-menu';

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
    const count = await this.prisma.siteGroups.count({
      where: { group: code },
    });
    return count > 0;
  }

  /**
   * Busca grupo de empresas
   * @param groupId ID do grupo
   * @returns O grupo de empresas ou null se não encontrado.
   */
  async getGroupByCode(groupId: string): Promise<SiteGroups | null> {
    try {
      return await this.prisma.siteGroups.findUnique({
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
    try {
      const count = await this.prisma.taxCodes.count({ where: { taxCode, legislation } });
      return count > 0;
    } catch (error) {
      console.error('Erro ao buscar código de imposto:', error);
      throw new Error('Could not fetch tax code.');
    }
  }

  /**
   * Get the tax codes from the database
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async getTaxCodes<T extends FindTaxCodesArgs>(args: T): Promise<Prisma.TaxCodesGetPayload<T>[]> {
    try {
      return (await this.prisma.taxCodes.findMany(args)) as any;
    } catch (error) {
      console.error('Erro ao buscar códigos de imposto:', error);
      throw new Error('Could not fetch tax codes.');
    }
  }

  /**
   * Check if a miscellaneous table exists
   * @param glossaryId - The number of the miscellaneous table to check.
   * @param code - The code in the miscellaneous table to check.
   * @returns Return true if the table exists, false otherwise.
   * @throws Error if there is a problem querying the database.
   */
  async miscellaneousTableExists(glossaryId: number, code: string): Promise<boolean> {
    try {
      const count = await this.prisma.miscellaneousTable.count({
        where: { glossaryId: glossaryId, code: code },
      });
      return count > 0;
    } catch (error) {
      console.error('Erro ao buscar tabela de itens diversos:', error);
      throw new Error('Could not fetch miscellaneous table.');
    }
  }

  /**
   * Get miscellaneous data from the database.
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async getMiscellaneousData<T extends FindMiscellaneousTableArgs>(
    args: T,
  ): Promise<MiscellaneousResult<T>[] | undefined> {
    // Build the arguments for the Prisma query
    const prismaArgs: Prisma.MiscellaneousTableFindManyArgs = {
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
    };
    if (args.select) {
      prismaArgs.select = args.select;
    }

    try {
      // Fetch the data from the database
      const miscellaneousData = await this.prisma.miscellaneousTable.findMany(prismaArgs);
      if (miscellaneousData.length === 0) {
        console.warn('No miscellaneous data found with the provided criteria.');
        return [];
      }

      // Build a join for description and shortDescription if they are included
      const descriptionsOptions = args.include?.descriptions;
      if (!descriptionsOptions || (!descriptionsOptions.description && !descriptionsOptions.shortDescription)) {
        return miscellaneousData as unknown as MiscellaneousResult<T>[];
      }
      const includeDescription = !!descriptionsOptions.description;
      const includeShortDescription = !!descriptionsOptions.shortDescription;
      const includeSelect = descriptionsOptions.select;

      // Prepare keys for fetching descriptions
      const keys = miscellaneousData.map((item) => ({
        identifier1: String(item.glossaryId),
        identifier2: item.code,
      }));

      const typesToFetch: Array<'LNGDES' | 'SHODES'> = [];
      if (includeDescription) typesToFetch.push('LNGDES');
      if (includeShortDescription) typesToFetch.push('SHODES');

      // Build the select object for the query
      const selectArgs: Prisma.TextToTranslateFindManyArgs = {
        where: {
          table: 'ATABDIV',
          field: { in: typesToFetch },
          OR: keys,
        },
      };
      if (includeSelect) {
        selectArgs.select = {
          ...includeSelect,
          table: true,
          field: true,
          language: true,
          identifier1: true,
          identifier2: true,
        };
      }

      // Fetch related descriptions in a single query
      const descriptions = await this.prisma.textToTranslate.findMany(selectArgs);

      // Map descriptions back to the miscellaneous data
      const descriptionMap = new Map<string, any>();
      const shortDescriptionMap = new Map<string, any>();

      for (const desc of descriptions) {
        const uniqueKey = `${desc.identifier1}:${desc.identifier2}`;

        if (desc.field === 'LNGDES') {
          descriptionMap.set(uniqueKey, desc);
        } else if (desc.field === 'SHODES') {
          shortDescriptionMap.set(uniqueKey, desc);
        }
      }

      // Attach descriptions to the miscellaneous data
      const result = miscellaneousData.map((item) => {
        const uniqueKey = `${item.glossaryId}:${item.code}`;
        const resultItem: any = { ...item };

        if (includeDescription) {
          resultItem.description = descriptionMap.get(uniqueKey) || null;
        }
        if (includeShortDescription) {
          resultItem.shortDescription = shortDescriptionMap.get(uniqueKey) || null;
        }

        return resultItem as MiscellaneousResult<T>;
      });

      return result;
    } catch (error) {
      console.error('Erro ao buscar dados diversos:', error);
      throw new Error('Could not fetch miscellaneous data.');
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

  /**
   * Get the next value for a sequence on the database.
   * @param sequenceName - The name of the sequence to get the next value from.
   * @param transaction - Optional Prisma transaction client to run the query within a transaction.
   * @returns A Promise that resolves to the next value of the sequence as a number.
   */
  async getNextSequenceValue(args: SequenceArgs): Promise<number> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    const { sequenceName, transaction } = args;
    const prismaClient = transaction || this.prisma;

    // Ensure the sequence name is safe to use in a raw query
    if (!/^[a-zA-Z0-9_]+$/.test(sequenceName)) {
      throw new Error(`Invalid sequence name format: ${sequenceName}.`);
    }

    const query = `SELECT NEXT VALUE FOR ${dbSchema}.${sequenceName}`;

    try {
      const result: { '': bigint }[] = await prismaClient.$queryRawUnsafe(query);

      if (result.length === 0) {
        throw new Error(`Sequence ${sequenceName} not found or returned no results.`);
      }

      return Number(result[0]['']);
    } catch (error) {
      console.error('Erro ao buscar o próximo valor da sequência:', error);
      throw new Error(`Could not generate a unique number.`);
    }
  }
}
