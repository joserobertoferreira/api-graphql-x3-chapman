import { LocalMenus } from '@chapman/utils';
import { Injectable } from '@nestjs/common';
import { FiscalYear, Period, Prisma, SalesOrderType, SiteGroups } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticalEntry,
  AnalyticalEntrySelect,
  AnalyticalEntryWhereInput,
  FindBusinessPartnerTaxRulesArgs,
  FindMiscellaneousTableArgs,
  FindProductTaxRulesArgs,
  FindTaxCodesArgs,
  FindTaxDeterminationArgs,
  IntercompanyJournalEntrySequenceNumber,
  MiscellaneousResult,
  PaymentMethodInfo,
  PurchaseSequenceNumber,
  SequenceArgs,
  X3ObjectInfo,
} from '../types/common.types';
import { createDateRange, YearMonth } from '../utils/date.utils';

@Injectable()
export class CommonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a sales order type exists
   * @param orderType - The sales order type to check.
   * @param legislation - (Optional) The legislation associated with the order type.
   * @returns Return true if the sales order type exists, false otherwise.
   */
  async salesOrderTypeExists(orderType: string, legislation?: string): Promise<boolean> {
    // build the where condition
    const whereCondition: Prisma.SalesOrderTypeWhereInput = { orderType };
    if (legislation) {
      whereCondition.legislation = legislation;
    }

    try {
      const count = await this.prisma.salesOrderType.count({
        where: whereCondition,
      });
      return count > 0;
    } catch (error) {
      console.error('Erro ao buscar tipo de encomenda de venda:', error);
      throw new Error('Could not fetch sales order type.');
    }
  }

  /**
   * Fetches the sales order type.
   * @param orderType Sales order type.
   * @param legislation (Optional) Legislation.
   * @returns The found SalesOrderType object or null if it does not exist.
   */
  async getSalesOrderType(orderType: string, legislation?: string): Promise<SalesOrderType | null> {
    // build the where condition
    const whereCondition: Prisma.SalesOrderTypeWhereInput = { orderType };
    if (legislation) {
      whereCondition.legislation = legislation;
    }

    try {
      return await this.prisma.salesOrderType.findFirst({
        where: whereCondition,
      });
    } catch (error) {
      console.error('Erro ao buscar tipo de encomenda de venda:', error);
      throw new Error('Could not fetch the sales order type.');
    }
  }

  /**
   * Returns the sequence number for the specified sales order type
   * @param orderType Sales order type
   * @returns The sequence number or null if not found.
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
   * Returns the sequence number for the specified purchase order type
   * @returns The sequence number or null if not found.
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
   * Returns the sequence number for the specified intercompany journal entry type
   * @param legislations (Optional) Legislation filter
   * @returns The sequence number or null if not found.
   */
  async getIntercompanyJournalEntrySequenceNumber(
    legislations: string[] = [],
  ): Promise<IntercompanyJournalEntrySequenceNumber[]> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      return [];
    }

    try {
      const conditions = [Prisma.sql`MODULE_0 = 2`];

      const legislationFilter = legislations
        .filter((leg) => typeof leg === 'string' && leg !== null && leg != undefined)
        .map((leg) => leg.trim());

      if (legislationFilter.length > 0) {
        conditions.push(Prisma.sql`LEG_0 IN (${Prisma.join(legislationFilter)})`);
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

      const query = Prisma.sql`
          SELECT LEG_0 as legislation, CODNUM_13 as 'counter' FROM ${Prisma.raw(dbSchema)}.TABCOUAFF ${whereClause}`;

      const results: IntercompanyJournalEntrySequenceNumber[] = await this.prisma.$queryRaw(query);

      return results;
    } catch (error) {
      console.error('Erro ao buscar o contador para o lançamento contábil intersociedade:', error);
      throw new Error('Could not fetch the sequence number for the intercompany journal entry.');
    }
  }

  /**
   * Fetches the country name by its code
   * @param countryCode Country code
   * @returns The country name or null if not found.
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
   * Check if tax determination exits
   * @param taxDetermination - The tax determination code to check.
   * @param legislation - (Optional) The legislation associated with the tax determination.
   * @param isActive - (Optional) Filter by active status.
   * @returns Return true if the tax determination exists, false otherwise.
   */
  async taxDeterminationExists(taxDetermination: string, legislation?: string, isActive?: boolean): Promise<boolean> {
    // build the where condition
    const whereCondition: Prisma.TaxDeterminationWhereInput = { code: taxDetermination };
    if (legislation) {
      whereCondition.legislation = legislation;
    }
    if (isActive !== undefined) {
      whereCondition.isActive = isActive ? { equals: LocalMenus.NoYes.YES } : { lt: LocalMenus.NoYes.YES };
    }

    try {
      const count = await this.prisma.taxDetermination.count({ where: whereCondition });
      return count > 0;
    } catch (error) {
      console.error('Erro ao buscar determinação de imposto:', error);
      throw new Error('Could not fetch tax determination.');
    }
  }

  /**
   * Get the tax determinations from the database
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async getTaxDeterminations<T extends FindTaxDeterminationArgs>(
    args: T,
  ): Promise<Prisma.TaxDeterminationGetPayload<T>[]> {
    try {
      return (await this.prisma.taxDetermination.findMany(args)) as any;
    } catch (error) {
      console.error('Erro ao buscar determinações de imposto:', error);
      throw new Error('Could not fetch tax determinations.');
    }
  }

  /**
   * Check if a product tax rule exists
   * @param code - The product tax rule code to check.
   * @param legislation - (Optional) The legislation associated with the tax code.
   * @param isActive - (Optional) Filter by active status.
   * @returns Return true if the product tax code exists, false otherwise.
   */
  async productTaxRuleExists(code: string, legislation?: string, isActive?: boolean): Promise<boolean> {
    // build the where condition
    const whereCondition: Prisma.ProductTaxRuleWhereInput = { code };
    if (legislation) {
      whereCondition.legislation = legislation;
    }
    if (isActive !== undefined) {
      whereCondition.isActive = isActive ? { equals: LocalMenus.NoYes.YES } : { lt: LocalMenus.NoYes.YES };
    }

    try {
      const count = await this.prisma.productTaxRule.count({ where: whereCondition });
      return count > 0;
    } catch (error) {
      console.error('Erro ao buscar código de imposto do produto:', error);
      throw new Error('Could not fetch product tax rule code.');
    }
  }

  /**
   * Get the product tax rules from the database
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async getProductTaxRules<T extends FindProductTaxRulesArgs>(args: T): Promise<Prisma.ProductTaxRuleGetPayload<T>[]> {
    try {
      return (await this.prisma.productTaxRule.findMany(args)) as any;
    } catch (error) {
      console.error('Erro ao buscar códigos de imposto do produto:', error);
      throw new Error('Could not fetch product tax rule codes.');
    }
  }

  /**
   * Check if a business partner tax rule exists
   * @param code - The business partner tax rule code to check.
   * @param legislation - (Optional) The legislation associated with the tax code.
   * @param isActive - (Optional) Filter by active status.
   * @returns Return true if the business partner tax code exists, false otherwise.
   */
  async businessPartnerTaxRuleExists(code: string, legislation?: string, isActive?: boolean): Promise<boolean> {
    const whereCondition: Prisma.BusinessPartnerTaxRuleWhereInput = { code };
    if (legislation) {
      whereCondition.legislation = legislation;
    }
    if (isActive !== undefined) {
      whereCondition.isActive = isActive ? { equals: LocalMenus.NoYes.YES } : { lt: LocalMenus.NoYes.YES };
    }

    try {
      const count = await this.prisma.businessPartnerTaxRule.count({ where: whereCondition });
      return count > 0;
    } catch (error) {
      console.error('Erro ao buscar código de imposto do parceiro de negócios:', error);
      throw new Error('Could not fetch business partner tax rule code.');
    }
  }

  /**
   * Get the business partner tax rules from the database
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async getBusinessPartnerTaxRules<T extends FindBusinessPartnerTaxRulesArgs>(
    args: T,
  ): Promise<Prisma.BusinessPartnerTaxRuleGetPayload<T>[]> {
    try {
      return (await this.prisma.businessPartnerTaxRule.findMany(args)) as any;
    } catch (error) {
      console.error('Erro ao buscar códigos de imposto do parceiro de negócios:', error);
      throw new Error('Could not fetch business partner tax rule codes.');
    }
  }

  /**
   * Check if a tax code exists
   * @param taxCode - The tax code to check.
   * @param legislation - (Optional) The legislation associated with the tax code.
   * @returns Return true if the tax code exists, false otherwise.
   */
  async taxCodeExists(taxCode: string, legislation?: string): Promise<boolean> {
    const whereCondition: Prisma.TaxCodesWhereInput = { code: taxCode };
    if (legislation) {
      whereCondition.legislation = legislation;
    }

    try {
      const count = await this.prisma.taxCodes.count({ where: whereCondition });
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
  ): Promise<Period | null> {
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

      return fiscalPeriod;
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

  /**
   * Get information about the x3 object.
   * @param object - The x3 object to get information about.
   * @returns An object containing information about the x3 object.
   */
  async getObjectInformation(object: string): Promise<X3ObjectInfo | null> {
    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    try {
      const results: X3ObjectInfo[] = await this.prisma.$queryRaw<X3ObjectInfo[]>(
        Prisma.sql`
          SELECT ABREV_0 as objectCode, MODULE_0 as module
          FROM ${Prisma.raw(dbSchema)}.AOBJET WHERE ABREV_0 = ${object}
        `,
      );

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar informações do objeto X3:', error);
      throw new Error('Could not fetch X3 object information.');
    }
  }

  /**
   * Get the payment method code for a given list of payment term codes.
   * @param paymentTerms - An array of payment term codes.
   * @returns A map of payment term codes to their corresponding payment method codes, or null if not found.
   */
  async getPaymentMethodByTerms(paymentTerms: string[]): Promise<Map<string, PaymentMethodInfo>> {
    if (!paymentTerms || paymentTerms.length === 0) {
      return new Map();
    }

    const dbSchema = process.env.DB_SCHEMA;

    if (!dbSchema) {
      console.error('Erro: Variável de ambiente DB_SCHEMA não está definida.');
      throw new Error('Database schema configuration missing.');
    }

    try {
      const results: { PTE_0: string; PAM_0: string; PAMTYP_0: number }[] = await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT PTE_0, PAM_0, PAMTYP_0 FROM ${Prisma.raw(dbSchema)}.TABPAYTERM WHERE PTE_0 IN (${Prisma.join(paymentTerms)})
        `,
      );

      return new Map(results.map((r) => [r.PTE_0, { paymentMethod: r.PAM_0, paymentType: r.PAMTYP_0 }]));
    } catch (error) {
      console.error('Erro ao buscar o método de pagamento pelo código dos termos de pagamento:', error);
      throw new Error('Could not fetch the payment method.');
    }
  }
}
