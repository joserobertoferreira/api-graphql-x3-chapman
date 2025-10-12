import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { PrismaTransactionClient } from '../../common/types/common.types';
import { SalesOrderSequenceNumber, ValidatedSalesOrderContext } from '../../common/types/sales-order.types';
import { totalValuesByKey } from '../../common/utils/decimal.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CloseSalesOrderLineInput } from './dto/close-sales-order-line.input';
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
import { mapLineToEntity } from './helpers/sales-order.mapper';
import { SalesOrderContextService } from './sales-order-context.service';
import { SalesOrderViewService } from './sales-order-view.service';

const salesOrderLineInclude = Prisma.validator<Prisma.SalesOrderLineInclude>()({
  price: true,
});

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceNumberService: CounterService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly contextService: SalesOrderContextService,
    private readonly salesOrderViewService: SalesOrderViewService,
    private readonly currencyService: CurrencyService,
    private readonly accountService: AccountService,
  ) {}

  async create(input: CreateSalesOrderInput, debug: boolean): Promise<SalesOrderEntity> {
    // Execute the context building outside the transaction
    const { context, updatedInput } = await this.contextService.buildHeaderContext(input);

    if (debug) {
      await test_validation(
        context,
        updatedInput,
        this.commonService,
        this.businessPartnerService,
        this.accountService,
        this.currencyService,
        this.parametersService,
        this.salesOrderViewService,
      );
      console.log('Debug mode is ON. Sales Order creation is skipped.');
      return {} as SalesOrderEntity; // Temporary return for testing
    }

    const { customer, site, ledgers, salesOrderType, dimensionTypesMap, lines } = context;

    const createPayload = await buildSalesOrderCreationPayload(
      updatedInput,
      customer,
      site,
      this.businessPartnerService,
      this.commonService,
      this.currencyService,
      this.parametersService,
    );

    // Database transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Setup data for lines (SORDERQ) and prices (SORDERP)
      let currentLineNumber = 1000;

      const linesToCreate: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[] = [];
      const pricesToCreate: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[] = [];
      const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[] = [];

      for (const lineInput of lines) {
        const product = await tx.products.findUnique({ where: { code: lineInput.product } });
        if (!product) {
          throw new NotFoundException(`Product ${lineInput.product} not found.`);
        }

        // const linePrice = lineInput.grossPrice ?? (product.PURBASPRI_0 as unknown as number);
        const lineNumber = currentLineNumber;

        currentLineNumber += 1000;

        // Setup data for lines (SORDERQ)
        const linePayload = await buildSalesOrderLineCreationPayload(createPayload, lineInput, lineNumber);

        linesToCreate.push(...linePayload);

        // Setup data for analytical accounting (if needed)
        const analyticalData = await buildAnalyticalAccountingLinesPayload(
          lineInput,
          ledgers,
          dimensionTypesMap,
          this.accountService,
        );

        analyticalToCreate.push(...analyticalData);

        // Setup data for prices (SORDERP)
        const linePrice = new Prisma.Decimal(lineInput.grossPrice ?? 0);

        const pricePayload = await buildSalesOrderPriceCreationPayload(
          createPayload,
          lineInput,
          lineNumber,
          linePrice,
          product,
          this.currencyService,
        );

        for (const price of pricePayload) {
          price.analyticalAccountingLines = {
            create: analyticalData,
          };
        }

        pricesToCreate.push(...pricePayload);
      }

      // Calculate sales order totals
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

      // Get the next unique number for the sales order
      const newOrderNumber = await this.getNextOrderNumber(tx, {
        orderType: salesOrderType.orderType,
        company: '',
        salesSite: site.siteCode,
        legislation: '',
        orderDate: updatedInput.orderDate ?? new Date(),
        complement: '',
      });

      // Create the sales order header (SORDER)
      const orderHeader = await tx.salesOrder.create({
        data: {
          orderNumber: newOrderNumber,
          ...createPayload,
          numberOfLines: linesToCreate.length,
          linesAmountExcludingTax: amountExcludingTax,
          totalAmountExcludingTax: amountExcludingTax,
          linesAmountRemainingToDeliverExcludingTax: amountExcludingTax,
          linesAmountExcludingTaxInCompanyCurrency: amountExcludingTaxInCompanyCurrency,
          totalAmountExcludingTaxInCompanyCurrency: amountExcludingTaxInCompanyCurrency,
          totalMargin: amountExcludingTax,
          linesAmountIncludingTax: amountIncludingTax,
          totalAmountIncludingTax: amountIncludingTax,
          linesAmountRemainingToDeliverIncludingTax: amountIncludingTax,
          linesAmountIncludingTaxInCompanyCurrency: amountIncludingTaxInCompanyCurrency,
          totalAmountIncludingTaxInCompanyCurrency: amountIncludingTaxInCompanyCurrency,
          totalQuantityDistributedOnLines: totalValuesByKey(linesToCreate, 'quantityInSalesUnitOrdered'),
          orderLines: {
            create: linesToCreate,
          },
          orderPrices: {
            create: pricesToCreate,
          },
        },
      });

      if (!orderHeader) {
        throw new Error('Fatal error: The sales order could not be created.');
      }
      return orderHeader;
    });

    // Return created sales order
    return this.salesOrderViewService.findOne(createdOrder.orderNumber);
  }

  /**
   * Closes the sales order line and updates the order status.
   * @param input Object containing the necessary data to identify and close a sales order line.
   * @returns Promise<SalesOrderLineEntity> The updated sales order line.
   */
  async closeSalesOrderLines(input: CloseSalesOrderLineInput): Promise<SalesOrderLineEntity[]> {
    const { orderNumber, lines: lineNumbers } = input;

    if (!lineNumbers || lineNumbers.length === 0) {
      throw new BadRequestException('At least one line number is required.');
    }

    // Check if the order and lines exist
    const [orderCount, existingLines] = await Promise.all([
      this.prisma.salesOrder.count({
        where: { orderNumber: orderNumber, orderStatus: 1 },
      }),
      this.prisma.salesOrderLine.findMany({
        where: {
          orderNumber: orderNumber,
          lineNumber: { in: lineNumbers },
        },
        select: { lineNumber: true },
      }),
    ]);

    if (orderCount === 0) {
      throw new NotFoundException(`Sales Order with number ${orderNumber} not found.`);
    }

    if (existingLines.length !== lineNumbers.length) {
      const foundLineNumbers = existingLines.map((l) => l.lineNumber);
      const missingLines = lineNumbers.filter((lineNumber) => !foundLineNumbers.includes(lineNumber));

      if (missingLines.length > 0) {
        throw new NotFoundException(
          `Sales Order Lines not found for order number ${orderNumber} and line numbers: ${missingLines.join(', ')}.`,
        );
      }
    }

    // Check if the order status allows cancellation
    const status = await this.prisma.salesOrder.findUnique({
      where: { orderNumber: orderNumber },
      select: { accountingValidationStatus: true },
    });

    if (status?.accountingValidationStatus !== 2) {
      throw new BadRequestException('Accounting Order status does not allow cancellation.');
    }

    const updatedLines = await this.prisma.$transaction(async (tx) => {
      // Updates the status of the sales order line
      await tx.salesOrderLine.updateMany({
        where: {
          orderNumber: orderNumber,
          lineNumber: { in: lineNumbers },
        },
        data: {
          lineStatus: 3,
          accountingValidationStatus: 1,
        },
      });

      // Updates the order status if all lines are closed
      const remainingLines = await tx.salesOrderLine.count({
        where: {
          orderNumber: orderNumber,
          lineStatus: {
            equals: 1,
          },
        },
      });

      if (remainingLines === 0) {
        await tx.salesOrder.update({
          where: { orderNumber: orderNumber },
          data: { orderStatus: 2, accountingValidationStatus: 1 },
        });
      } else {
        await tx.salesOrder.update({
          where: { orderNumber: orderNumber },
          data: { accountingValidationStatus: 1 },
        });
      }

      // Fetch the complete data for the updated lines
      return tx.salesOrderLine.findMany({
        where: {
          orderNumber: orderNumber,
          lineNumber: { in: lineNumbers },
        },
        include: salesOrderLineInclude,
      });
    });

    return updatedLines.map((line) => mapLineToEntity(line));
  }

  /**
   * Gets the next available sales order number.
   */
  async getNextOrderNumber(tx: PrismaTransactionClient, args: SalesOrderSequenceNumber): Promise<string> {
    const { orderType, salesSite, orderDate, complement, company } = args;

    const sequenceNumber = await this.commonService.getSalesOrderTypeSequenceNumber(orderType);
    if (!sequenceNumber) {
      throw new Error(`Sequence number for order type ${orderType} not found.`);
    }

    // Get the next counter value for the order type
    const nextCounterValue = await this.sequenceNumberService.getNextCounterTransaction(
      tx,
      sequenceNumber,
      company,
      salesSite,
      orderDate,
      complement,
    );

    return nextCounterValue;
  }
}

// Helper function for testing validation (should be outside the class)
async function test_validation(
  context: ValidatedSalesOrderContext,
  input: CreateSalesOrderInput,
  commonService: CommonService,
  businessPartnerService: BusinessPartnerService,
  accountService: AccountService,
  currencyService: CurrencyService,
  parametersService: ParametersService,
  salesOrderViewService: SalesOrderViewService,
) {
  const res = await salesOrderViewService.findOne('S1042510SOI00000003');

  console.log('res', res);

  const { customer, site, ledgers, salesOrderType, dimensionTypesMap, lines } = context;

  const createPayload = await buildSalesOrderCreationPayload(
    input,
    customer,
    site,
    businessPartnerService,
    commonService,
    currencyService,
    parametersService,
  );

  let currentLineNumber = 1000;

  const linesToCreate: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[] = [];
  const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[] = [];

  for (const lineInput of lines) {
    const lineNumber = currentLineNumber;

    currentLineNumber += 1000;

    // 1. Prepara os dados da LINHA (SORDERQ)
    const linePayload = await buildSalesOrderLineCreationPayload(createPayload, lineInput, lineNumber);

    linesToCreate.push(...linePayload);

    // 2. Preparar dados de contabilidade analítica (se necessário)
    const analyticalData = await buildAnalyticalAccountingLinesPayload(
      lineInput,
      ledgers,
      dimensionTypesMap,
      accountService,
    );

    analyticalToCreate.push(...analyticalData);
  }

  console.log('------------------------------');
  // console.log('context', context);
  // console.log('------------------------------');
  // console.log('payload', payload.lines);
  // console.log('------------------------------');
  // console.log('openItems', openItems);
  // console.log('------------------------------');
}
