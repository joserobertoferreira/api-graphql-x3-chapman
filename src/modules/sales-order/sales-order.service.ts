import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CounterService } from 'src/common/counter/counter.service';
import { ParametersService } from 'src/common/parameters/parameter.service';
import { AccountService } from 'src/common/services/account.service';
import { CurrencyService } from 'src/common/services/currency.service';
import { IntersiteContext } from 'src/common/types/business-partner.types';
import { PrismaTransactionClient } from 'src/common/types/common.types';
import {
  CrossSitePurchaseOrder,
  UpdatedSalesOrderLinkedWithPurchaseOrder,
} from 'src/common/types/purchase-order.types';
import {
  CrossSiteSalesOrder,
  salesOrderFullInclude,
  SalesOrderSequenceNumber,
  SalesOrderWithLines,
  ValidatedSalesOrderContext,
} from 'src/common/types/sales-order.types';
import { totalValuesByKey } from 'src/common/utils/decimal.utils';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ICreatedDocumentWithLines, ICreateDocumentLineText } from '../../common/types/document-text.types';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { DocumentTextService } from '../common/common-text.service';
import { CommonService } from '../common/common.service';
import { DimensionTypeConfigService } from '../dimension-types/dimension-type-config.service';
import { mapAnalyticsToDimensionsInput } from '../dimensions/helpers/dimension.helper';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderCreatedEvent } from './events/sales-order-created.event';
import { SalesOrderLineTextEvent } from './events/sales-order-line-text.event';
import {
  buildAnalyticalAccountingLinesPayload,
  buildSalesOrderLineCreationPayload,
  buildSalesOrderPriceCreationPayload,
} from './helpers/sales-order-line-payload-builder';
import { buildSalesOrderCreationPayload } from './helpers/sales-order-payload-builder';
import { calculateSalesOrderTotals } from './helpers/sales-order-total-helper';
import { SalesOrderContextService } from './sales-order-context.service';
import { SalesOrderViewService } from './sales-order-view.service';

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
    private readonly documentTextService: DocumentTextService,
  ) {}

  /**
   * Creates a new sales order along with its lines and prices.
   * @param input The input data for creating the sales order.
   * @param debug Boolean flag to enable debug mode (validation only).
   * @returns The created SalesOrderEntity.
   */
  async create(input: CreateSalesOrderInput, debug: boolean): Promise<SalesOrderEntity> {
    if (debug) {
      console.log('DEBUG', debug);
    }
    // Execute the context building outside the transaction
    const { context, updatedInput, intersiteContext } = await this.contextService.buildHeaderContext(input);

    // Build the payloads to create a sales order
    const { headerToCreate, linesToCreate, pricesToCreate, analyticalToCreate, textToCreate } =
      await this._buildCreateOrderPayloads(context, updatedInput);

    // Check if exists lines with text to create
    const linesWithText: ICreateDocumentLineText[] = textToCreate
      .filter((line) => line.text && line.text.trim() !== '')
      .map((line) => ({
        textNumber: '', // Placeholder, will be filled during creation
        lineNumber: line.lineNumber,
        text: line.text,
      }));

    // Database transaction to create the sales order
    const { createdOrder, textSequenceNumber } = await this._createSalesOrderTransaction(
      headerToCreate,
      linesToCreate,
      pricesToCreate,
      analyticalToCreate,
      updatedInput.orderDate ?? new Date(),
      context,
      linesWithText,
    );

    // Emit event after successful creation if the order is intercompany or has text line.
    if (createdOrder) {
      const isIntersite = (createdOrder.isIntersite as LocalMenus.NoYes) === LocalMenus.NoYes.YES;
      const isIntercompany = (createdOrder.isIntercompany as LocalMenus.NoYes) === LocalMenus.NoYes.YES;
      const withIntersite = (isIntersite || isIntercompany) && createdOrder.customerOrderReference.trim() === '';

      if ((textSequenceNumber?.length ?? 0) > 0) {
        console.log(`Emitting event for line text sales order: ${createdOrder.orderNumber}`);

        const textPayload: ICreatedDocumentWithLines = {
          documentNumber: createdOrder.orderNumber,
          documentLines: textSequenceNumber,
        };

        const textEvent = new SalesOrderLineTextEvent(textPayload);

        this.eventEmitter.emit('common.created.lineText', textEvent);
      }

      if (withIntersite) {
        console.log(`Emitting event for intercompany sales order: ${createdOrder.orderNumber}`);

        const crossSalesOrder: CrossSiteSalesOrder = {
          ...createdOrder,
          intersiteContext: intersiteContext,
        };

        const event = new SalesOrderCreatedEvent(crossSalesOrder);

        this.eventEmitter.emit('salesOrder.created.intercompany', event);
      }
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
    linesWithText: ICreateDocumentLineText[],
  ): Promise<{ createdOrder: SalesOrderWithLines; textSequenceNumber: ICreateDocumentLineText[] }> {
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
    const rate = headerPayload.currencyRate as number;
    const amountExcludingTaxInCompanyCurrency = amountExcludingTax
      .mul(rate)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const amountIncludingTaxInCompanyCurrency = amountIncludingTax
      .mul(rate)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
    const totalQuantityDistributedOnLines = totalValuesByKey(linesPayload, 'quantityInSalesUnitOrdered');

    // Database transaction
    const { newOrder, orderTextLines } = await this.prisma.$transaction(async (tx) => {
      // Get the next unique number for the sales order
      const newOrderNumber = await this.getNextOrderNumber(tx, {
        orderType: context.salesOrderType.orderType,
        company: '',
        salesSite: context.site.siteCode,
        legislation: '',
        orderDate: orderDate,
        complement: '',
      });

      // Get the next unique number for the sales order text lines
      const textLines: ICreateDocumentLineText[] = [];
      if (linesWithText.length > 0) {
        for (const line of linesWithText) {
          const textNumber = await this.getNextTextNumber(tx, 'SOQ');

          if (textNumber) {
            textLines.push({
              textNumber: `SOQ~${textNumber}`,
              lineNumber: line.lineNumber,
              text: line.text,
            });

            const payloadLine = linesPayload.find((l) => l.lineNumber === line.lineNumber);

            if (payloadLine) {
              payloadLine.orderLineTextKey = `SOQ~${textNumber}`;
            }
          }
        }
      }

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

      return { newOrder: orderHeader, orderTextLines: textLines };
    });

    return { createdOrder: newOrder, textSequenceNumber: orderTextLines };
  }

  /**
   * Build the payloads to create a sales order.
   */
  async _buildCreateOrderPayloads(context: ValidatedSalesOrderContext, input: CreateSalesOrderInput) {
    const { customer, site, ledgers, dimensionTypesMap, systemUsed, lines } = context;

    // Check products existence and prepare line items
    const productList = [...new Set(lines.map((line) => line.product))];

    // Fetch product details from the database
    const products = await this.prisma.products.findMany({
      where: { code: { in: productList } },
    });

    // Validate that all products exist
    if (products.length !== productList.length) {
      const foundProducts = new Set(products.map((prod) => prod.code));
      const missingProducts = productList.filter((code) => !foundProducts.has(code));
      throw new NotFoundException(`Products not found: ${missingProducts.join(', ')}`);
    }

    const productMap = new Map(products.map((prod) => [prod.code, prod]));

    // Build the payloads to create a sales order
    const headerToCreate = await buildSalesOrderCreationPayload(
      input,
      customer,
      site,
      systemUsed,
      this.businessPartnerService,
      this.commonService,
      this.currencyService,
      this.parametersService,
    );

    let currentLineNumber = 1000;

    const textToCreate: { lineNumber: number; text: string }[] = [];
    const linesToCreate: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[] = [];
    const pricesToCreate: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[] = [];
    const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[] = [];

    for (const lineInput of lines) {
      const product = productMap.get(lineInput.product);
      if (!product) {
        throw new NotFoundException(`Product not found: ${lineInput.product}`);
      }

      // const linePrice = lineInput.grossPrice ?? (product.PURBASPRI_0 as unknown as number);
      const lineNumber = currentLineNumber;

      currentLineNumber += 1000;

      // Setup data for lines (SORDERQ)
      const linePayload = buildSalesOrderLineCreationPayload(headerToCreate, lineInput, lineNumber);

      linesToCreate.push(...linePayload);

      // Check if there is text to create for the line
      if (lineInput.orderLineText && lineInput.orderLineText.trim() !== '') {
        textToCreate.push({ lineNumber: lineNumber, text: lineInput.orderLineText.trim() });
      }

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
      textToCreate,
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
   * Get the next available text number
   */
  async getNextTextNumber(tx: PrismaTransactionClient, args: string): Promise<string> {
    const tableAbbreviation = args;
    const nextTextNumber = await this.documentTextService.getNextTextNumber(tx, tableAbbreviation);
    return nextTextNumber;
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
      const newSalesOrder = await this.create(salesOrderInput, false);
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
                lineNumber: purchaseLine.lineNumber,
                sequenceNumber: purchaseLine.lineNumber,
              },
            },
            data: {
              purchaseOrder: purchaseOrder.orderNumber,
              purchaseOrderLine: purchaseLine.lineNumber,
              purchaseOrderSequenceNumber: purchaseLine.lineNumber,
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
