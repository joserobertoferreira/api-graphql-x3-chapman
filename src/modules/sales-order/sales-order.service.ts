import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { ParametersService } from '../../common/parameters/parameter.service';
import { CommonService } from '../../common/services/common.service';
import { stringsToArray } from '../../common/utils/array.utils';
import { totalValuesByKey } from '../../common/utils/decimal.utils';
import { DimensionsValidator } from '../../common/validators/dimensions.validator';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CompanyService } from '../companies/company.service';
import { CustomerService } from '../customers/customer.service';
import { ProductService } from '../products/product.service';
import { CloseSalesOrderLineInput } from './dto/close-sales-order-line.input';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderConnection } from './entities/sales-order-connection.entity';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import {
  buildAnalyticalAccountingLinesPayload,
  buildSalesOrderLineCreationPayload,
  buildSalesOrderPriceCreationPayload,
} from './helpers/sales-order-line-payload-builder';
import { buildSalesOrderCreationPayload } from './helpers/sales-order-payload-builder';
import { calculateSalesOrderTotals } from './helpers/sales-order-total-helper';
import { buildSalesOrderWhereClause } from './helpers/sales-order-where-builder';
import { SalesOrderContextService } from './sales-order-context.service';

interface SalesOrderSequenceNumber {
  orderType: string;
  legislation: string;
  salesSite: string;
  orderDate: Date;
  complement: string;
}

const salesOrderLineInclude = Prisma.validator<Prisma.SalesOrderLineInclude>()({
  price: true,
});

type SalesOrderLineWithPrice = Prisma.SalesOrderLineGetPayload<{
  include: typeof salesOrderLineInclude;
}>;

const salesOrderInclude = Prisma.validator<Prisma.SalesOrderInclude>()({
  orderLines: {
    include: salesOrderLineInclude,
  },
});

type SalesOrderWithRelations = Prisma.SalesOrderGetPayload<{
  include: typeof salesOrderInclude;
}>;

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly sequenceNumberService: CounterService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly companyService: CompanyService,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
    private readonly dimensionsValidator: DimensionsValidator,
    private readonly contextService: SalesOrderContextService,
  ) {}

  private mapToEntity(order: SalesOrderWithRelations): SalesOrderEntity {
    return {
      id: order.id,
      salesSite: order.salesSite,
      orderDate: order.orderDate,
      shippingDate: order.shipmentDate,
      requestedDeliveryDate: order.requestedDeliveryDate,
      customerOrderReference: order.customerOrderReference,
      currency: order.currency,
      currencyRateType: order.currencyRateType,
      currencyRate: order.currencyRate ? order.currencyRate.toNumber() : 0,
      taxRule: order.taxRule,
      totalAmountExcludingTax: order.totalAmountExcludingTax.toNumber(),
      totalAmountIncludingTax: order.totalAmountIncludingTax.toNumber(),
      soldTo: {
        soldToCustomerCode: order.soldToCustomer,
        soldToCustomerName: stringsToArray(order.soldToCustomerName1, order.soldToCustomerName2),
        soldToCustomerAddress: order.soldToCustomerAddress,
        soldAddressLines: stringsToArray(order.soldAddressLine1, order.soldAddressLine2, order.soldAddressLine3),
        soldToCustomerCity: order.soldToCustomerCity,
        soldToCustomerState: order.soldToCustomerState,
        soldToCustomerPostalCode: order.soldToCustomerPostalCode,
        soldToCustomerCountry: order.soldToCustomerCountry,
        soldToCustomerCountryName: order.soldToCustomerCountryName,
      },
      billTo: {
        billToCustomerCode: order.billToCustomer,
        billToCustomerName: stringsToArray(order.billToCustomerName1, order.billToCustomerName2),
        billToCustomerAddress: order.billToCustomerAddress,
        billAddressLines: stringsToArray(order.billAddressLine1, order.billAddressLine2, order.billAddressLine3),
        billToCustomerCity: order.billToCustomerCity,
        billToCustomerState: order.billToCustomerState,
        billToCustomerPostalCode: order.billToCustomerPostalCode,
        billToCustomerCountry: order.billToCustomerCountry,
        billToCustomerCountryName: order.billToCustomerCountryName,
        billToCustomerEuropeanUnionVatNumber: order.billToCustomerEuropeanUnionVatNumber,
      },
      shipTo: {
        shipToCustomerName: stringsToArray(order.shipToCustomerName1, order.shipToCustomerName2),
        shipToCustomerAddress: order.shipToCustomerAddress,
        shipAddressLines: stringsToArray(order.shipAddressLine1, order.shipAddressLine2, order.shipAddressLine3),
        shipToCustomerCity: order.shipToCustomerCity,
        shipToCustomerState: order.shipToCustomerState,
        shipToCustomerPostalCode: order.shipToCustomerPostalCode,
        shipToCustomerCountry: order.shipToCustomerCountry,
        shipToCustomerCountryName: order.shipToCustomerCountryName,
      },
      lines: order.orderLines?.map((line) => this.mapLineToEntity(line)) || [],
    };
  }

  private mapLineToEntity(line: SalesOrderLineWithPrice): SalesOrderLineEntity {
    if (!line.price) {
      throw new InternalServerErrorException(`Price information missing for order line ${line.lineNumber}.`);
    }

    // Consolida os níveis de imposto em um array, como fizemos com os endereços
    const taxLevels = stringsToArray(line.price.taxLevel1, line.price.taxLevel2, line.price.taxLevel3);

    return {
      //id: `${line.salesOrder}-${line.lineNumber}`,
      id: line.salesOrder,
      lineNumber: line.lineNumber,

      // Campos de SalesOrderLine (SORDERQ)
      requestedDeliveryDate: line.requestedDeliveryDate,
      shipmentDate: line.shipmentDate,
      orderedQuantity: line.quantityInSalesUnitOrdered.toNumber(),
      status: line.lineStatus,

      // Campos de SalesOrderPrice (SORDERP)
      // description: line.price.productDescriptionInUserLanguage,
      taxLevels: taxLevels,
      grossPrice: line.price.grossPrice.toNumber(),
      netPrice: line.price.netPrice.toNumber(),

      productCode: line.product,
    };
  }

  async findOne(id: string): Promise<SalesOrderEntity> {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: salesOrderInclude,
    });

    if (!order) {
      throw new NotFoundException(`Sales Order with ID "${id}" not found.`);
    }

    return this.mapToEntity(order);
  }

  async findPaginated(args: PaginationArgs, filter?: SalesOrderFilterInput): Promise<SalesOrderConnection> {
    const { first, after } = args;

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    const where = buildSalesOrderWhereClause(filter);

    const [orders, totalCount] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        include: salesOrderInclude,
        orderBy: { id: 'asc' },
      }),
      this.prisma.salesOrder.count({ where: where }),
    ]);

    const hasNextPage = orders.length > first;
    const nodes = hasNextPage ? orders.slice(0, -1) : orders;

    const edges = nodes.map((order) => ({
      cursor: Buffer.from(order.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(order),
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
        hasNextPage,
        hasPreviousPage: after ? true : false,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrderEntity | null> {
    // Executa a validação do contexto da encomenda
    const context = await this.contextService.buildHeaderContext(input);

    // if (input.dimensions && input.dimensions.length > 0) {
    //   const isValid = await this.dimensionsValidator.validate(input.dimensions);
    //   if (!isValid) {
    //     throw new BadRequestException(this.dimensionsValidator.defaultMessage());
    //   }
    // }

    // const dimensionTypeMap = new Map<string, number>();
    // for (let i = 1; i <= 20; i++) {
    //   // Acessa dinamicamente os campos DIE_0...DIE_19 do Site
    //   // O Prisma mapeia DIE_0 para dimensionType1, DIE_1 para dimensionType2, etc.
    //   const typeCode = siteInformation.company[`dimensionType${i}`];
    //   if (typeCode) {
    //     dimensionTypeMap.set(typeCode as string, i);
    //   }
    // }

    // if (input.dimensions) {
    //   for (const dimPair of input.dimensions) {
    //     const index = dimensionTypeMap.get(dimPair.typeCode);

    //     if (index) {
    //       // Atribui dinamicamente ao payload CCE_X e DIE_X
    //       (payload as any)[`dimensionType${index}`] = dimPair.typeCode;
    //       (payload as any)[`dimension${index}`] = dimPair.value;
    //     } else {
    //       // Opcional: Tratar o caso de uma dimensão inválida para este site
    //       console.warn(`Dimension type "${dimPair.typeCode}" is not configured for site "${site.siteCode}".`);
    //     }
    //   }
    // }

    const createPayload = await buildSalesOrderCreationPayload(
      input,
      context.customer,
      context.site,
      this.businessPartnerService,
      this.commonService,
      this.parametersService,
    );

    const ledgers = context.ledgers;

    const debug_enabled = false;

    // 2. Transação
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // A. Preparar dados para as linhas (SORDERQ) e preços (SORDERP)
      let currentLineNumber = 1000;

      const linesToCreate: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[] = [];
      const pricesToCreate: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[] = [];
      const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[] = [];

      for (const lineInput of input.lines) {
        const product = await tx.products.findUnique({ where: { code: lineInput.product } });
        if (!product) {
          throw new NotFoundException(`Product ${lineInput.product} not found.`);
        }

        // const linePrice = lineInput.grossPrice ?? (product.PURBASPRI_0 as unknown as number);
        const lineNumber = currentLineNumber;

        currentLineNumber += 1000;

        // 1. Prepara os dados da LINHA (SORDERQ)
        const linePayload = await buildSalesOrderLineCreationPayload(createPayload, lineInput, lineNumber);

        linesToCreate.push(...linePayload);

        // 2. Preparar dados de contabilidade analítica (se necessário)
        const analyticalData = await buildAnalyticalAccountingLinesPayload(createPayload, ledgers, this.commonService);

        analyticalToCreate.push(...analyticalData);

        // 3. Prepara os dados do PREÇO (SORDERP) correspondente
        const linePrice = new Prisma.Decimal(lineInput.grossPrice ?? 0);

        const pricePayload = await buildSalesOrderPriceCreationPayload(
          createPayload,
          lineInput,
          lineNumber,
          linePrice,
          product,
          this.commonService,
        );

        for (const price of pricePayload) {
          price.analyticalAccountingLines = {
            create: analyticalData,
          };
        }

        pricesToCreate.push(...pricePayload);
      }

      if (debug_enabled) {
        throw new Error('Debug...');
      }

      // B. Obter o próximo número da encomenda
      const newOrderNumber = await this.getNextOrderNumber({
        orderType: input.salesOrderType ?? 'SON',
        salesSite: input.salesSite,
        legislation: '',
        orderDate: input.orderDate ?? new Date(),
        complement: '',
      });

      // C. Calcular os totais da encomenda
      const totals = calculateSalesOrderTotals(pricesToCreate, linesToCreate, [
        'netPriceExcludingTax',
        'netPriceIncludingTax',
      ]);

      const amountExcludingTax = totals.netPriceExcludingTax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const amountIncludingTax = totals.netPriceIncludingTax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const rate = createPayload.currencyRate as Prisma.Decimal.Value;
      const amountExcludingTaxInCompanyCurrency = amountExcludingTax
        .mul(rate)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const amountIncludingTaxInCompanyCurrency = amountIncludingTax
        .mul(rate)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);

      // D. Criar o cabeçalho com os dados aninhados
      const orderHeader = await tx.salesOrder.create({
        data: {
          id: newOrderNumber,
          ...createPayload,
          numberOfLines: linesToCreate.length,
          linesAmountExcludingTax: amountExcludingTax,
          totalAmountExcludingTax: amountExcludingTax,
          linesAmountRemainingToDeliverExcludingTax: amountExcludingTax,
          linesAmountExcludingTaxInCompanyCurrency: amountExcludingTaxInCompanyCurrency,
          totalAmountExcludingTaxInCompanyCurrency: amountExcludingTaxInCompanyCurrency,
          totalMargin: amountExcludingTax,
          INRNOT_0: amountExcludingTax,
          linesAmountIncludingTax: amountIncludingTax,
          totalAmountIncludingTax: amountIncludingTax,
          linesAmountRemainingToDeliverIncludingTax: amountIncludingTax,
          linesAmountIncludingTaxInCompanyCurrency: amountIncludingTaxInCompanyCurrency,
          totalAmountIncludingTaxInCompanyCurrency: amountIncludingTaxInCompanyCurrency,
          totalQuantityDistributedOnLines: totalValuesByKey(linesToCreate, 'quantityInSalesUnitOrdered'),
          INRATI_0: amountIncludingTax,
          orderLines: {
            create: linesToCreate,
          },
          orderPrices: {
            create: pricesToCreate,
          },
        },
      });

      if (!orderHeader) {
        throw new Error('Erro fatal: A encomenda não pôde ser criada.');
      }
      return orderHeader;
    });

    // Retornar a encomenda criada
    return this.findOne(createdOrder.id);
  }

  /**
   * Salda a linha da encomenda e atualiza o status da encomenda.
   * @param input Objeto contendo os dados necessários para identificar e fechar uma linha de encomenda de venda.
   * @returns Promise<SalesOrderLineEntity> A linha da encomenda atualizada.
   */
  async closeSalesOrderLines(input: CloseSalesOrderLineInput): Promise<SalesOrderLineEntity[]> {
    const { id: orderId, lines: lineNumbers } = input;

    if (!orderId || !lineNumbers || lineNumbers.length === 0) {
      throw new BadRequestException('Sales Order ID and at least one line number are required.');
    }

    // 1. Verifica se a encomenda e as linhas existem
    const [orderCount, existingLines] = await Promise.all([
      this.prisma.salesOrder.count({
        where: { id: orderId },
      }),
      this.prisma.salesOrderLine.findMany({
        where: {
          salesOrder: orderId,
          lineNumber: { in: lineNumbers },
        },
        select: { lineNumber: true },
      }),
    ]);

    if (orderCount === 0) {
      throw new NotFoundException(`Sales Order with ID "${orderId}" not found.`);
    }

    if (existingLines.length !== lineNumbers.length) {
      const foundLineNumbers = existingLines.map((l) => l.lineNumber);
      const missingLines = lineNumbers.filter((lineNumber) => !foundLineNumbers.includes(lineNumber));

      if (missingLines.length > 0) {
        throw new NotFoundException(
          `Sales Order Lines not found for order ID "${orderId}" and line numbers: ${missingLines.join(', ')}.`,
        );
      }
    }

    const updatedLines = await this.prisma.$transaction(async (tx) => {
      // 2. Atualiza o status da linha da encomenda
      await tx.salesOrderLine.updateMany({
        where: {
          salesOrder: orderId,
          lineNumber: { in: lineNumbers },
        },
        data: {
          lineStatus: 3,
          accountingValidationStatus: 1,
        },
      });

      // 3. Atualiza o status da encomenda se todas as linhas estiverem fechadas
      const remainingLines = await tx.salesOrderLine.count({
        where: {
          salesOrder: orderId,
          lineStatus: {
            equals: 1,
          },
        },
      });

      if (remainingLines === 0) {
        await tx.salesOrder.update({
          where: { id: orderId },
          data: { orderStatus: 2 },
        });
      }

      // 5. Busca os dados completos das linhas atualizadas
      return tx.salesOrderLine.findMany({
        where: {
          salesOrder: orderId,
          lineNumber: { in: lineNumbers },
        },
        include: salesOrderLineInclude,
      });
    });

    return updatedLines.map((line) => this.mapLineToEntity(line));
  }

  /**
   * Obtém o próximo número de encomenda disponível.
   */
  async getNextOrderNumber(args: SalesOrderSequenceNumber): Promise<string> {
    const { orderType, legislation, salesSite, orderDate, complement } = args;

    const sequenceNumber = await this.commonService.getSalesOrderTypeSequenceNumber(orderType);
    if (!sequenceNumber) {
      throw new Error(`Sequence number for order type ${orderType} not found.`);
    }

    // Obtém o próximo valor do contador para o tipo de ordem
    const nextCounterValue = await this.sequenceNumberService.getNextCounter(
      sequenceNumber,
      salesSite,
      orderDate,
      complement,
    );

    return nextCounterValue;
  }
}
