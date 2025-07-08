import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { CommonService } from '../../common/services/common.service';
import { stringsToArray } from '../../common/utils/array.utils';
import { totalValuesByKey } from '../../common/utils/decimal.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CompanyService } from '../companies/company.service';
import { CustomerService } from '../customers/customer.service';
import { ProductService } from '../products/product.service';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import {
  buildAnalyticalAccountingLinesPayload,
  buildSalesOrderLineCreationPayload,
  buildSalesOrderPriceCreationPayload,
} from './helpers/sales-order-line-payload-builder';
import { buildSalesOrderCreationPayload } from './helpers/sales-order-payload-builder';
import { calculateSalesOrderTotals } from './helpers/sales-order-total-helper';

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

      // Campos de SalesOrderPrice (SORDERP)
      description: line.price.productDescriptionInUserLanguage,
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

  async create(input: CreateSalesOrderInput): Promise<SalesOrderEntity | null> {
    // 1. Validações e Busca de Dados Preliminares
    const customerReturn = await this.customerService.findOne(input.soldToCustomer);
    if (!customerReturn) {
      throw new Error(`Customer ${input.soldToCustomer} not found.`);
    }

    const customer = customerReturn.raw as Prisma.CustomerGetPayload<{
      include: { addresses: true; businessPartner: true };
    }>;
    if (!customer) {
      throw new NotFoundException(`Customer ${input.soldToCustomer} not found.`);
    }

    const siteInformation = await this.companyService.getSiteByCode(input.salesSite, { company: true });
    if (!siteInformation) {
      throw new Error(`Sales site ${input.salesSite} not found.`);
    }

    const ledgers = await this.commonService.getLedgers(siteInformation.company.ACM_0);
    if (!ledgers || ledgers.length === 0) {
      throw new Error(`No ledgers found for company ${siteInformation.legalCompany}.`);
    }

    const createPayload = await buildSalesOrderCreationPayload(
      input,
      customer,
      siteInformation,
      this.businessPartnerService,
      this.commonService,
      this.parametersService,
    );

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
