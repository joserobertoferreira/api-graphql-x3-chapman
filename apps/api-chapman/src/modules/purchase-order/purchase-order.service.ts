import { LocalMenus } from '@chapman/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { IntersiteContext } from '../../common/types/business-partner.types';
import { PrismaTransactionClient, PurchaseSequenceNumber } from '../../common/types/common.types';
import { automaticJournalWithLinesArgs } from '../../common/types/journal-entry.types';
import {
  CrossSitePurchaseOrder,
  purchaseOrderFullInclude,
  PurchaseOrderSequenceNumber,
  PurchaseOrderWithLines,
  ValidatedPurchaseOrderContext,
} from '../../common/types/purchase-order.types';
import { CrossSiteSalesOrder, UpdatedPurchaseOrderLinkedWithSalesOrder } from '../../common/types/sales-order.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../common/utils/audit-date.utils';
import { calculatePrice } from '../../common/utils/sales-price.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { DimensionTypeConfigService } from '../dimension-types/dimension-type-config.service';
import { mapAnalyticsToDimensionsInput } from '../dimensions/helpers/dimension.helper';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { PurchaseOrderEntity } from './entities/purchase-order.entity';
import { PurchaseOrderCreatedEvent } from './events/purchase-order-created.event';
import {
  buildAnalyticalAccountingLinesPayload,
  buildPurchaseOrderLineCreationPayload,
  buildPurchaseOrderPriceCreationPayload,
} from './helpers/purchase-order-line-payload-builder';
import { buildPurchaseOrderCreationPayload } from './helpers/purchase-order-payload-builder';
import { accumulateOrAddTax, calculatePurchaseOrderTotals } from './helpers/purchase-order-total-helper';
import { PurchaseOrderContextService } from './purchase-order-context.service';
import { PurchaseOrderViewService } from './purchase-order-view.service';

const purchaseOrderLineInclude = Prisma.validator<Prisma.PurchaseOrderLineInclude>()({
  price: true,
});

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sequenceNumberService: CounterService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly contextService: PurchaseOrderContextService,
    private readonly purchaseOrderViewService: PurchaseOrderViewService,
    private readonly currencyService: CurrencyService,
    private readonly accountService: AccountService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
  ) {}

  /**
   * Creates a new purchase order along with its lines and prices.
   * @param input The input data for creating the purchase order.
   * @param debug Boolean flag to enable debug mode (validation only).
   * @returns The created PurchaseOrderEntity.
   */
  async create(input: CreatePurchaseOrderInput, debug: boolean): Promise<PurchaseOrderEntity> {
    // Execute the context building outside the transaction
    const { context, updatedInput, intersiteContext } = await this.contextService.buildHeaderContext(input);

    // Build the payloads to create a sales order
    const { headerToCreate, linesToCreate, pricesToCreate, analyticalToCreate, footerToCreate } =
      await this._buildCreateOrderPayloads(context, updatedInput);

    // Database transaction to create the purchase order
    const createdOrder = await this._createPurchaseOrderTransaction(
      headerToCreate,
      linesToCreate,
      pricesToCreate,
      analyticalToCreate,
      footerToCreate,
      updatedInput.orderDate ?? new Date(),
      context,
    );

    // Emit event after successful creation if the order is intercompany
    if (
      createdOrder &&
      (createdOrder.interSites === LocalMenus.NoYes.YES || createdOrder.interCompany === LocalMenus.NoYes.YES) &&
      createdOrder.acknowledgmentNumber.trim() === ''
    ) {
      console.log(`Emitting event for intercompany purchase order: ${createdOrder.orderNumber}`);

      const crossPurchaseOrder: CrossSitePurchaseOrder = {
        ...createdOrder,
        intersiteContext: intersiteContext,
      };

      const event = new PurchaseOrderCreatedEvent(crossPurchaseOrder);

      this.eventEmitter.emit('purchaseOrder.created.intercompany', event);
    }

    const newOrder = await this.purchaseOrderViewService.findOne(createdOrder.orderNumber);

    // Return created purchase order
    return newOrder;
  }

  /**
   * Private method to execute the transaction for creating a purchase order.
   */
  async _createPurchaseOrderTransaction(
    headerPayload: Prisma.PurchaseOrderCreateInput,
    linesPayload: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[],
    pricesPayload: Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput[],
    analyticsPayload: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[],
    footerPayload: Prisma.PurchaseDocumentsFooterUncheckedCreateInput[],
    orderDate: Date,
    context: ValidatedPurchaseOrderContext,
  ): Promise<PurchaseOrderWithLines> {
    // Check if exists different codes for fixture dimensions
    const distinctDimensions = Array.from(new Set(analyticsPayload.map((line) => line.dimension1).filter(Boolean)));

    if (distinctDimensions.length > 1) {
      headerPayload.dimension1 = 'MULTIPLE';
    } else if (distinctDimensions.length === 1) {
      headerPayload.dimension1 = distinctDimensions[0] ? (distinctDimensions[0] as string) : '';
    }

    // Calculate purchase order totals
    const totals = calculatePurchaseOrderTotals(linesPayload, [
      'lineAmountIncludingTax',
      'taxExcludedLineAmount',
      'quantityInOrderUnitOrdered',
      'tax1amount',
      'linePurchaseCostInCompanyCurrency',
    ]);

    const rate = headerPayload.currencyRate as Prisma.Decimal.Value;
    const taxInCompanyCurrency = totals.tax1amount.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const amountIncludingTaxInCompanyCurrency = totals.linePurchaseCostInCompanyCurrency
      .add(taxInCompanyCurrency)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);

    // Database transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Get the next unique number for the purchase order
      const newOrderNumber = await this.getNextOrderNumber(tx, {
        company: '',
        purchaseSite: context.site.siteCode,
        legislation: '',
        orderDate: orderDate,
        complement: '',
      });

      // Create footers (if any)
      footerPayload.forEach((line, index) => {
        const timestamps = getAuditTimestamps();
        const lineUUID = generateUUIDBuffer();

        line.documentType = 3;
        line.orderNumber = newOrderNumber;
        line.index = index + 1;
        line.deductableTax = line.taxAmount;
        line.deductiblePercentage = 100;
        line.createDate = timestamps.date;
        line.updateDate = timestamps.date;
        line.createDatetime = timestamps.dateTime;
        line.updateDatetime = timestamps.dateTime;
        line.singleID = lineUUID;
      });

      // Create the purchase order header (PORDER)
      const orderHeader = await tx.purchaseOrder.create({
        data: {
          orderNumber: newOrderNumber,
          ...headerPayload,
          numberOfLines: linesPayload.length,
          amountOfLinesIncludingTax: totals.lineAmountIncludingTax,
          amountOfLinesExcludingTax: totals.taxExcludedLineAmount,
          totalQuantityOfLines: totals.quantityInOrderUnitOrdered,
          totalTaxAmount: totals.tax1amount,
          totalAmountExcludingTax: totals.taxExcludedLineAmount,
          totalAmountIncludingTax: totals.lineAmountIncludingTax,
          totalAmountExcludingTaxInCompanyCurrency: totals.linePurchaseCostInCompanyCurrency,
          totalAmountIncludingTaxInCompanyCurrency: amountIncludingTaxInCompanyCurrency,
          orderLines: {
            create: linesPayload,
          },
          orderPrices: {
            create: pricesPayload,
          },
          orderFooter: {
            create: footerPayload,
          },
        },
        include: purchaseOrderFullInclude,
      });

      if (!orderHeader) {
        throw new Error('The purchase order could not be created.');
      }

      const purchaseOrder = await tx.purchaseOrder.findUniqueOrThrow({
        where: { orderNumber: orderHeader.orderNumber },
        include: purchaseOrderFullInclude,
      });

      return purchaseOrder;
    });

    return createdOrder;
  }

  /**
   * Build the payloads to create a purchase order.
   */
  async _buildCreateOrderPayloads(context: ValidatedPurchaseOrderContext, input: CreatePurchaseOrderInput) {
    const { supplier, site, ledgers, dimensionTypesMap, lines } = context;

    const headerToCreate = await buildPurchaseOrderCreationPayload(
      input,
      supplier,
      site,
      this.businessPartnerService,
      this.currencyService,
      this.parametersService,
    );

    const automaticJournalArgs = automaticJournalWithLinesArgs({ lineFilter: { lineNumber: 1 } });
    const automaticJournals = await this.accountService.getAutomaticJournals({
      ...automaticJournalArgs,
      where: { code: 'PORD' },
    });

    const companyCurrency = context.site.company?.accountingCurrency ?? 'GBP';

    // Setup data for lines (PORDERQ) and prices (PORDERP)
    let currentLineNumber = 1000;

    const linesToCreate: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[] = [];
    const pricesToCreate: Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput[] = [];
    const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput[] = [];
    const footerToCreate: Prisma.PurchaseDocumentsFooterUncheckedCreateInput[] = [];

    for (const lineInput of lines) {
      const product = await this.prisma.products.findUnique({ where: { code: lineInput.product } });
      if (!product) {
        throw new NotFoundException(`Product ${lineInput.product} not found.`);
      }

      // const linePrice = lineInput.grossPrice ?? (product.PURBASPRI_0 as unknown as number);
      const lineNumber = currentLineNumber;

      currentLineNumber += 1000;

      const linePrice = new Decimal(lineInput.grossPrice ?? 0);
      const lineTaxLevel = lineInput.taxLevelCode ?? '';

      // Get the tax rate from the product or default to 0 if not available
      const taxRateResult = await this.currencyService.getTaxRate(
        lineTaxLevel,
        typeof headerToCreate.createDate === 'string'
          ? new Date(headerToCreate.createDate)
          : (headerToCreate.createDate ?? new Date()),
      );
      const taxRate = taxRateResult ? taxRateResult.rate.toNumber() : 0;

      // Calculate the price with tax and without tax
      const taxExcludedLineAmount = linePrice.mul(new Decimal(Number(lineInput.quantity)));

      const calculatedPrice = calculatePrice(taxExcludedLineAmount, 1, taxRate);

      // Setup data for lines (PORDERQ)
      const linePayload = await buildPurchaseOrderLineCreationPayload(
        headerToCreate,
        site?.defaultAddress ?? '',
        companyCurrency,
        lineInput,
        lineNumber,
        taxExcludedLineAmount,
        calculatedPrice,
        product,
      );

      accumulateOrAddTax(
        footerToCreate,
        lineInput.taxLevelCode ?? '',
        taxExcludedLineAmount,
        calculatedPrice.taxValue,
        new Decimal(taxRate),
      );

      linesToCreate.push(...linePayload);

      // Setup data for analytical accounting (if needed)
      const analyticalData = await buildAnalyticalAccountingLinesPayload(
        lineInput,
        product,
        ledgers,
        dimensionTypesMap,
        automaticJournals[0],
        this.accountService,
      );

      analyticalToCreate.push(...analyticalData);

      // Setup data for prices (PORDERP)
      const pricePayload = await buildPurchaseOrderPriceCreationPayload(
        headerToCreate,
        site?.defaultAddress ?? '',
        lineInput,
        lineNumber,
        linePrice,
        lineTaxLevel,
        product,
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
      footerToCreate,
    };
  }

  /**
   * Gets the next available sales order number.
   */
  async getNextOrderNumber(tx: PrismaTransactionClient, args: PurchaseOrderSequenceNumber): Promise<string> {
    const { company, purchaseSite, legislation, orderDate, complement } = args;

    const sequenceNumbers = await this.commonService.getPurchaseOrderTypeSequenceNumber();
    if (!sequenceNumbers || sequenceNumbers.length === 0) {
      throw new Error(`Sequence number for purchase order not found.`);
    }

    let sequenceNumber: PurchaseSequenceNumber | undefined;

    // Try to find for the specified legislation
    sequenceNumber = sequenceNumbers.find((record) => record.legislation.trim() === legislation);

    // If not found, try to fetch for the blank legislation
    if (!sequenceNumber) {
      console.log('No sequence number found for legislation:', legislation, 'trying default');
      sequenceNumber = sequenceNumbers.find((record) => record.legislation.trim() === '');
      console.log(sequenceNumber);
    }

    if (!sequenceNumber) {
      throw new NotFoundException(`No applicable sequence number found for legislation ${legislation} or default.`);
    }

    // Get the next counter value for the order type
    const nextCounterValue = await this.sequenceNumberService.getNextCounterTransaction(
      tx,
      sequenceNumber.counter,
      company,
      purchaseSite,
      orderDate,
      complement,
    );

    return nextCounterValue;
  }

  /**
   * Create a purchase order based on a sales order and intersite context.
   */
  async createPurchaseOrderFromSalesOrder(
    salesOrder: CrossSiteSalesOrder,
    intersiteContext: IntersiteContext,
  ): Promise<PurchaseOrderWithLines | void> {
    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();

    // Map the lines.
    const priceLineMap = new Map((salesOrder.orderPrices || []).map((price) => [price.lineNumber, price]));

    const purchaseOrderLines = (salesOrder.orderLines || [])
      .map((soLine) => {
        const lineNumber = soLine.lineNumber;

        const priceData = priceLineMap.get(lineNumber);
        if (!priceData) {
          throw new Error(`Price data not found for line number: ${lineNumber}`);
        }

        const analyticsData = priceData.analyticalAccountingLines?.[0];

        const soNumber = salesOrder.orderNumber;
        const lineSequence = soLine.sequenceNumber;
        const product = soLine.product;
        const quantity = soLine.quantityInSalesUnitOrdered.toNumber();
        const grossPrice = priceData.grossPrice.toNumber();
        const taxLevelCode = priceData.tax1;

        const dimensions = mapAnalyticsToDimensionsInput(analyticsData, dimensionTypesMap);

        return {
          salesOrder: soNumber,
          salesOrderLine: lineNumber,
          salesOrderSequence: lineSequence,
          product,
          quantity,
          grossPrice,
          taxLevelCode,
          dimensions,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    // Build the input DTO for creating the sales order.
    if (purchaseOrderLines.length === 0) {
      console.warn(
        `No valid lines could be mapped for SO ${salesOrder.orderNumber}. Aborting Purchase Order creation.`,
      );
      return;
    }

    const purchaseOrderInput: CreatePurchaseOrderInput = {
      purchaseSite: intersiteContext.sendingSite!,
      orderDate: salesOrder.orderDate,
      supplier: intersiteContext.sender!,
      buyer: 'INTER',
      taxRule: salesOrder.taxRule,
      shippingSite: salesOrder.sourceSite,
      sourceSite: salesOrder.salesSite,
      currency: salesOrder.currency,
      partialDelivery: salesOrder.partialDelivery,
      isIntersite: salesOrder.isIntersite,
      isIntercompany: salesOrder.isIntercompany,
      acknowledgmentDate: salesOrder.orderDate,
      acknowledgmentNote: 'Inter-site order',
      acknowledgmentNumber: salesOrder.orderNumber,
      soldToCustomer: salesOrder.soldToCustomer,
      lines: purchaseOrderLines,
    };

    // Call the purchase service to create the new order.
    try {
      const newPurchaseOrder = await this.create(purchaseOrderInput, false);
      if (newPurchaseOrder) {
        console.log('Successfully created purchase order:', newPurchaseOrder.orderNumber);

        const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
          where: { orderNumber: newPurchaseOrder.orderNumber },
          include: purchaseOrderFullInclude,
        });
        if (!purchaseOrder) {
          throw new Error('Purchase order creation failed: purchaseOrder is null.');
        }
        return purchaseOrder;
      }
    } catch (error) {
      console.error(`Error creating purchase order from sales order ${salesOrder.orderNumber}:`, error);
      throw error;
    }
  }

  /**
   * Updates a purchase order based on the provided sales order data.
   */
  async updatePurchaseOrderFromSalesOrder(order: UpdatedPurchaseOrderLinkedWithSalesOrder): Promise<void> {
    const { orderNumber, salesOrder } = order;

    await this.prisma.$transaction(async (tx) => {
      // Read the purchase order to ensure it exists
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { orderNumber: orderNumber },
        include: { orderLines: true },
      });
      if (!purchaseOrder) {
        throw new NotFoundException(`Purchase Order with order number ${orderNumber} not found.`);
      }

      const updateKey = (lineNumber: number, sequenceNumber: number) => `${lineNumber}|${sequenceNumber}`;

      const orderLinesMap = new Map(
        purchaseOrder.orderLines.map((line) => [updateKey(line.lineNumber, line.sequenceNumber), line]),
      );

      const linesToUpdate: Prisma.PurchaseOrderLineUpdateManyWithoutOrderNestedInput['update'] = [];

      for (const salesLine of salesOrder.orderLines) {
        const key = updateKey(salesLine.purchaseOrderLine, salesLine.purchaseOrderSequenceNumber);
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
              shippingSite: salesLine.shippingSite,
              acknowledgementNumber: salesOrder.orderNumber,
              acknowledgementDate: salesOrder.orderDate,
              interCompanySalesOrderLineNumber: salesLine.lineNumber,
              interCompanySalesOrderSequenceNumber: salesLine.sequenceNumber,
              salesOrder: salesOrder.orderNumber,
              salesOrderLine: salesLine.lineNumber,
              salesOrderSequenceNumber: salesLine.sequenceNumber,
            },
          });
        }
      }

      const updatePayload: Prisma.PurchaseOrderUpdateArgs = {
        where: { orderNumber: orderNumber },
        data: {
          interSites: salesOrder.isIntersite || LocalMenus.NoYes.NO,
          interCompany: salesOrder.isIntercompany || LocalMenus.NoYes.NO,
          purchaseSiteForIntersite: purchaseOrder.purchaseSite,
          shippingSite: salesOrder.shippingSite,
          salesSite: salesOrder.salesSite,
          soldToCustomer: salesOrder.soldToCustomer,
          acknowledgmentDate: salesOrder.orderDate,
          acknowledgmentNumber: salesOrder.orderNumber,
          acknowledgmentNote: 'Inter-site order',
          partialDelivery: salesOrder.partialDelivery,
          orderLines: {
            update: linesToUpdate,
          },
        },
      };

      // Update the purchase order header
      await tx.purchaseOrder.update(updatePayload);
    });
  }
}
