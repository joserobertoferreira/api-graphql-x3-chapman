import { LocalMenus } from '@chapman/utils';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from 'src/generated/prisma';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { IntersiteContext } from '../../common/types/business-partner.types';
import { PrismaTransactionClient } from '../../common/types/common.types';
import {
  CrossSitePurchaseOrder,
  UpdatedSalesOrderLinkedWithPurchaseOrder,
} from '../../common/types/purchase-order.types';
import {
  CrossSiteSalesOrder,
  salesOrderFullInclude,
  SalesOrderSequenceNumber,
  SalesOrderWithLines,
  ValidatedSalesOrderContext,
} from '../../common/types/sales-order.types';
import { totalValuesByKey } from '../../common/utils/decimal.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { DimensionTypeConfigService } from '../dimension-types/dimension-type-config.service';
import { mapAnalyticsToDimensionsInput } from '../dimensions/helpers/dimension.helper';
import { CloseSalesOrderLineInput } from './dto/close-sales-order-line.input';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderCreatedEvent } from './events/sales-order-created.event';
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
    private readonly eventEmitter: EventEmitter2,
    private readonly sequenceNumberService: CounterService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly contextService: SalesOrderContextService,
    private readonly salesOrderViewService: SalesOrderViewService,
    private readonly currencyService: CurrencyService,
    private readonly accountService: AccountService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
  ) {}

  /**
   * Creates a new sales order along with its lines and prices.
   * @param input The input data for creating the sales order.
   * @param debug Boolean flag to enable debug mode (validation only).
   * @returns The created SalesOrderEntity.
   */
  async create(input: CreateSalesOrderInput, debug: boolean): Promise<SalesOrderEntity> {
    // Execute the context building outside the transaction
    const { context, updatedInput, intersiteContext } = await this.contextService.buildHeaderContext(input);

    // Build the payloads to create a sales order
    const { headerToCreate, linesToCreate, pricesToCreate, analyticalToCreate } = await this._buildCreateOrderPayloads(
      context,
      updatedInput,
    );

    // Database transaction to create the sales order
    const createdOrder = await this._createSalesOrderTransaction(
      headerToCreate,
      linesToCreate,
      pricesToCreate,
      analyticalToCreate,
      updatedInput.orderDate ?? new Date(),
      context,
    );

    // Emit event after successful creation if the order is intercompany
    if (
      createdOrder &&
      (createdOrder.isIntersite === LocalMenus.NoYes.YES || createdOrder.isIntercompany === LocalMenus.NoYes.YES) &&
      createdOrder.customerOrderReference.trim() === ''
    ) {
      console.log(`Emitting event for intercompany sales order: ${createdOrder.orderNumber}`);

      const crossSalesOrder: CrossSiteSalesOrder = {
        ...createdOrder,
        intersiteContext: intersiteContext,
      };

      const event = new SalesOrderCreatedEvent(crossSalesOrder);

      this.eventEmitter.emit('salesOrder.created.intercompany', event);
    }

    const newOrder = await this.salesOrderViewService.findOne(createdOrder.orderNumber);

    // Return created sales order
    return newOrder;
  }

  /**
   * Private method to execute the transaction for creating a sales order.
   */
  async _createSalesOrderTransaction(
    headerPayload: Prisma.SalesOrderCreateInput,
    linesPayload: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[],
    pricesPayload: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[],
    analyticsPayload: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[],
    orderDate: Date,
    context: ValidatedSalesOrderContext,
  ): Promise<SalesOrderWithLines> {
    // Check if exists different codes for fixture dimensions
    const distinctDimensions = Array.from(new Set(analyticsPayload.map((line) => line.dimension1).filter(Boolean)));

    if (distinctDimensions.length > 1) {
      headerPayload.dimension1 = 'MULTIPLE';
    } else if (distinctDimensions.length === 1) {
      headerPayload.dimension1 = distinctDimensions[0] ? (distinctDimensions[0] as string) : '';
    }

    // Calculate sales order totals
    const totals = calculateSalesOrderTotals(pricesPayload, linesPayload, [
      'netPriceExcludingTax',
      'netPriceIncludingTax',
    ]);

    const amountExcludingTax = totals.netPriceExcludingTax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const amountIncludingTax = totals.netPriceIncludingTax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const rate = headerPayload.currencyRate as Prisma.Decimal.Value;
    const amountExcludingTaxInCompanyCurrency = amountExcludingTax
      .mul(rate)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const amountIncludingTaxInCompanyCurrency = amountIncludingTax
      .mul(rate)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const totalQuantityDistributedOnLines = totalValuesByKey(linesPayload, 'quantityInSalesUnitOrdered');

    // Database transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Get the next unique number for the sales order
      const newOrderNumber = await this.getNextOrderNumber(tx, {
        orderType: context.salesOrderType.orderType,
        company: '',
        salesSite: context.site.siteCode,
        legislation: '',
        orderDate: orderDate,
        complement: '',
      });

      // Create the sales order header (SORDER)
      const orderHeader = await tx.salesOrder.create({
        data: {
          orderNumber: newOrderNumber,
          ...headerPayload,
          numberOfLines: linesPayload.length,
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
          totalQuantityDistributedOnLines: totalQuantityDistributedOnLines,
          orderLines: {
            create: linesPayload,
          },
          orderPrices: {
            create: pricesPayload,
          },
        },
        include: salesOrderFullInclude,
      });

      if (!orderHeader) {
        throw new Error('Fatal error: The sales order could not be created.');
      }
      return orderHeader;
    });

    return createdOrder;
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
   * Build the payloads to create a sales order.
   */
  async _buildCreateOrderPayloads(context: ValidatedSalesOrderContext, input: CreateSalesOrderInput) {
    const { customer, site, ledgers, dimensionTypesMap, lines } = context;

    // Build the payloads to create a sales order
    const headerToCreate = await buildSalesOrderCreationPayload(
      input,
      customer,
      site,
      this.businessPartnerService,
      this.commonService,
      this.currencyService,
      this.parametersService,
    );

    let currentLineNumber = 1000;

    const linesToCreate: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[] = [];
    const pricesToCreate: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[] = [];
    const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[] = [];

    for (const lineInput of lines) {
      const product = await this.prisma.products.findUnique({ where: { code: lineInput.product } });
      if (!product) {
        throw new NotFoundException(`Product ${lineInput.product} not found.`);
      }

      // const linePrice = lineInput.grossPrice ?? (product.PURBASPRI_0 as unknown as number);
      const lineNumber = currentLineNumber;

      currentLineNumber += 1000;

      // Setup data for lines (SORDERQ)
      const linePayload = await buildSalesOrderLineCreationPayload(headerToCreate, lineInput, lineNumber);

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
        headerToCreate,
        lineInput,
        lineNumber,
        linePrice,
        lineInput.taxLevelCode ?? product.taxLevel1,
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

    return {
      headerToCreate,
      linesToCreate,
      pricesToCreate,
      analyticalToCreate,
    };
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

  /**
   * Create a sales order based on a purchase order and intersite context.
   */
  async createSalesOrderFromPurchaseOrder(
    purchaseOrder: CrossSitePurchaseOrder,
    intersiteContext: IntersiteContext,
  ): Promise<SalesOrderWithLines | void> {
    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();

    // Map the lines.
    const priceLineMap = new Map((purchaseOrder.orderPrices || []).map((price) => [price.lineNumber, price]));

    const salesOrderLines = (purchaseOrder.orderLines || [])
      .map((poLine) => {
        const lineNumber = poLine.lineNumber;

        const priceData = priceLineMap.get(lineNumber);
        if (!priceData) {
          throw new Error(`Price data not found for line number: ${lineNumber}`);
        }

        const analyticsData = priceData.analyticalAccountingLines?.[0];

        const poNumber = purchaseOrder.orderNumber;
        const lineSequence = poLine.sequenceNumber;
        const product = poLine.product;
        const quantity = poLine.quantityInPurchaseUnitOrdered.toNumber();
        const grossPrice = priceData.grossPrice.toNumber();
        const taxLevelCode = priceData.tax1;

        const dimensions = mapAnalyticsToDimensionsInput(analyticsData, dimensionTypesMap);

        return {
          purchaseOrder: poNumber,
          purchaseOrderLine: lineNumber,
          purchaseOrderSequence: lineSequence,
          product,
          quantity,
          grossPrice,
          taxLevelCode,
          dimensions,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    // Build the input DTO for creating the sales order.
    if (salesOrderLines.length === 0) {
      console.warn(
        `No valid lines could be mapped for PO ${purchaseOrder.orderNumber}. Aborting Sales Order creation.`,
      );
      return;
    }

    const salesOrderInput: CreateSalesOrderInput = {
      salesSite: intersiteContext.sendingSite!,
      salesOrderType: 'SOI',
      orderDate: purchaseOrder.orderDate,
      soldToCustomer: intersiteContext.sender!,
      taxRule: purchaseOrder.taxRule,
      currency: purchaseOrder.currency,
      customerOrderReference: purchaseOrder.orderNumber,
      shippingSite: intersiteContext.shippingSite,
      partialDelivery: intersiteContext.partialDelivery,
      isIntersite: intersiteContext.isIntersite,
      isIntercompany: intersiteContext.isInterCompany,
      sourceSite: purchaseOrder.purchaseSite,
      lines: salesOrderLines,
    };

    // Call the sales service to create the new order.
    try {
      const newSalesOrder = await this.create(salesOrderInput, true);
      if (newSalesOrder) {
        console.log('Successfully created sales order:', newSalesOrder.orderNumber);

        const salesOrder = await this.prisma.salesOrder.findUnique({
          where: { orderNumber: newSalesOrder.orderNumber },
          include: salesOrderFullInclude,
        });
        if (!salesOrder) {
          throw new Error('Sales order creation failed: salesOrder is null.');
        }
        return salesOrder;
      }
    } catch (error) {
      console.error(`Error creating sales order from purchase order ${purchaseOrder.orderNumber}:`, error);
      throw error;
    }
  }

  /**
   * Updates a sales order based on the provided sales order data.
   */
  async updateSalesOrderFromPurchaseOrder(order: UpdatedSalesOrderLinkedWithPurchaseOrder): Promise<void> {
    const { orderNumber, purchaseOrder } = order;

    await this.prisma.$transaction(async (tx) => {
      // Read the sales order to ensure it exists
      const salesOrder = await tx.salesOrder.findUnique({
        where: { orderNumber: orderNumber },
        include: { orderLines: true },
      });
      if (!salesOrder) {
        throw new NotFoundException(`Sales Order with order number ${orderNumber} not found.`);
      }

      const updateKey = (lineNumber: number, sequenceNumber: number) => `${lineNumber}|${sequenceNumber}`;

      const orderLinesMap = new Map(
        salesOrder.orderLines.map((line) => [updateKey(line.lineNumber, line.sequenceNumber), line]),
      );

      const linesToUpdate: Prisma.SalesOrderLineUpdateManyWithoutOrderNestedInput['update'] = [];

      for (const purchaseLine of purchaseOrder.orderLines) {
        const key = updateKey(purchaseLine.lineNumber, purchaseLine.sequenceNumber);
        const lineToUpdate = orderLinesMap.get(key);

        if (lineToUpdate) {
          linesToUpdate.push({
            where: {
              orderNumber_lineNumber_sequenceNumber: {
                orderNumber: orderNumber,
                lineNumber: lineToUpdate.lineNumber,
                sequenceNumber: lineToUpdate.sequenceNumber,
              },
            },
            data: {
              purchaseOrder: purchaseOrder.orderNumber,
              purchaseOrderLine: purchaseLine.lineNumber,
              purchaseOrderSequenceNumber: purchaseLine.sequenceNumber,
            },
          });
        }
      }

      const updatePayload: Prisma.SalesOrderUpdateArgs = {
        where: { orderNumber: orderNumber },
        data: {
          isIntersite: purchaseOrder.interSites || LocalMenus.NoYes.NO,
          isIntercompany: purchaseOrder.interCompany || LocalMenus.NoYes.NO,
          customerOrderReference: purchaseOrder.orderNumber,
          partialDelivery: purchaseOrder.partialDelivery,
          orderLines: {
            update: linesToUpdate,
          },
        },
      };

      // Update the sales order header
      await tx.salesOrder.update(updatePayload);
    });
  }
}
