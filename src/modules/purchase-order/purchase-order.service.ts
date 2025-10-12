import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { PrismaTransactionClient, PurchaseSequenceNumber } from '../../common/types/common.types';
import { PurchaseOrderSequenceNumber, ValidatedPurchaseOrderContext } from '../../common/types/purchase-order.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../common/utils/audit-date.utils';
import { calculatePrice } from '../../common/utils/sales-price.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { PurchaseOrderEntity } from './entities/purchase-order.entity';
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
    private readonly sequenceNumberService: CounterService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly contextService: PurchaseOrderContextService,
    private readonly purchaseOrderViewService: PurchaseOrderViewService,
    private readonly currencyService: CurrencyService,
    private readonly accountService: AccountService,
  ) {}

  async create(input: CreatePurchaseOrderInput, debug: boolean): Promise<PurchaseOrderEntity> {
    // Execute the context building outside the transaction
    const { context, updatedInput } = await this.contextService.buildHeaderContext(input);

    if (debug) {
      // Get the next unique number for the sales order
      const newOrderNumber = await this.getNextOrderNumber(this.prisma, {
        company: '',
        purchaseSite: context.site.siteCode,
        legislation: '',
        orderDate: updatedInput.orderDate ?? new Date(),
        complement: '',
      });

      // await test_validation(
      //   context,
      //   updatedInput,
      //   this.commonService,
      //   this.businessPartnerService,
      //   this.accountService,
      //   this.currencyService,
      //   this.parametersService,
      //   this.purchaseOrderViewService,
      //   this.prisma,
      // );
      console.log('Debug mode is ON. Purchase Order creation is skipped.');
      return {} as PurchaseOrderEntity; // Temporary return for testing
    }

    const { supplier, site, ledgers, dimensionTypesMap, lines } = context;

    const createPayload = await buildPurchaseOrderCreationPayload(
      updatedInput,
      supplier,
      site,
      this.businessPartnerService,
      this.currencyService,
      this.parametersService,
    );

    const companyCurrency = context.site.company?.accountingCurrency ?? 'GBP';

    // Database transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Setup data for lines (PORDERQ) and prices (PORDERP)
      let currentLineNumber = 1000;

      const linesToCreate: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[] = [];
      const pricesToCreate: Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput[] = [];
      const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput[] = [];
      const footerToCreate: Prisma.PurchaseDocumentsFooterUncheckedCreateInput[] = [];

      for (const lineInput of lines) {
        const product = await tx.products.findUnique({ where: { code: lineInput.product } });
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
          typeof createPayload.createDate === 'string'
            ? new Date(createPayload.createDate)
            : (createPayload.createDate ?? new Date()),
        );
        const taxRate = taxRateResult ? taxRateResult.rate.toNumber() : 0;

        // Calculate the price with tax and without tax
        const taxExcludedLineAmount = linePrice.mul(new Decimal(Number(lineInput.quantity)));

        const calculatedPrice = calculatePrice(taxExcludedLineAmount, 1, taxRate);

        // Setup data for lines (PORDERQ)
        const linePayload = await buildPurchaseOrderLineCreationPayload(
          createPayload,
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
          ledgers,
          dimensionTypesMap,
          this.accountService,
        );

        analyticalToCreate.push(...analyticalData);

        // Setup data for prices (PORDERP)
        const pricePayload = await buildPurchaseOrderPriceCreationPayload(
          createPayload,
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

      // Calculate sales order totals
      const totals = calculatePurchaseOrderTotals(linesToCreate, [
        'lineAmountIncludingTax',
        'taxExcludedLineAmount',
        'quantityInOrderUnitOrdered',
        'tax1amount',
        'linePurchaseCostInCompanyCurrency',
      ]);

      const rate = createPayload.currencyRate as Prisma.Decimal.Value;
      const taxInCompanyCurrency = totals.tax1amount.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const amountIncludingTaxInCompanyCurrency = totals.linePurchaseCostInCompanyCurrency
        .add(taxInCompanyCurrency)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);

      // Get the next unique number for the sales order
      const newOrderNumber = await this.getNextOrderNumber(tx, {
        company: '',
        purchaseSite: site.siteCode,
        legislation: '',
        orderDate: updatedInput.orderDate ?? new Date(),
        complement: '',
      });

      // Create footers (if any)
      footerToCreate.forEach((line, index) => {
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
          ...createPayload,
          numberOfLines: linesToCreate.length,
          amountOfLinesIncludingTax: totals.lineAmountIncludingTax,
          amountOfLinesExcludingTax: totals.taxExcludedLineAmount,
          totalQuantityOfLines: totals.quantityInOrderUnitOrdered,
          totalTaxAmount: totals.tax1amount,
          totalAmountExcludingTax: totals.taxExcludedLineAmount,
          totalAmountIncludingTax: totals.lineAmountIncludingTax,
          totalAmountExcludingTaxInCompanyCurrency: totals.linePurchaseCostInCompanyCurrency,
          totalAmountIncludingTaxInCompanyCurrency: amountIncludingTaxInCompanyCurrency,
          orderLines: {
            create: linesToCreate,
          },
          orderPrices: {
            create: pricesToCreate,
          },
          orderFooter: {
            create: footerToCreate,
          },
        },
      });

      if (!orderHeader) {
        throw new Error('The purchase order could not be created.');
      }
      return orderHeader;
    });

    // Return created purchase order
    return this.purchaseOrderViewService.findOne(createdOrder.orderNumber);
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
}

// Helper function for testing validation (should be outside the class)
async function test_validation(
  context: ValidatedPurchaseOrderContext,
  input: CreatePurchaseOrderInput,
  commonService: CommonService,
  businessPartnerService: BusinessPartnerService,
  accountService: AccountService,
  currencyService: CurrencyService,
  parametersService: ParametersService,
  purchaseOrderViewService: PurchaseOrderViewService,
  prisma: PrismaService,
) {
  const { supplier, site, ledgers, dimensionTypesMap, lines } = context;

  const createPayload = await buildPurchaseOrderCreationPayload(
    input,
    supplier,
    site,
    businessPartnerService,
    currencyService,
    parametersService,
  );

  const companyCurrency = context.site.company?.accountingCurrency ?? 'GBP';

  let currentLineNumber = 1000;

  const linesToCreate: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[] = [];
  const pricesToCreate: Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput[] = [];
  const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput[] = [];
  const footerToCreate: Prisma.PurchaseDocumentsFooterUncheckedCreateInput[] = [];

  for (const lineInput of lines) {
    const product = await prisma.products.findUnique({ where: { code: lineInput.product } });
    if (!product) {
      throw new NotFoundException(`Product ${lineInput.product} not found.`);
    }

    // const linePrice = lineInput.grossPrice ?? (product.PURBASPRI_0 as unknown as number);
    const lineNumber = currentLineNumber;

    currentLineNumber += 1000;

    const linePrice = new Decimal(lineInput.grossPrice ?? 0);
    const lineTaxLevel = lineInput.taxLevelCode ?? '';

    // Get the tax rate from the product or default to 0 if not available
    const taxRateResult = await currencyService.getTaxRate(
      lineTaxLevel,
      typeof createPayload.createDate === 'string'
        ? new Date(createPayload.createDate)
        : (createPayload.createDate ?? new Date()),
    );
    const taxRate = taxRateResult ? taxRateResult.rate.toNumber() : 0;

    // Calculate the price with tax and without tax
    const taxExcludedLineAmount = linePrice.mul(new Decimal(Number(lineInput.quantity)));

    const calculatedPrice = calculatePrice(taxExcludedLineAmount, 1, taxRate);

    // Setup data for lines (PORDERQ)
    const linePayload = await buildPurchaseOrderLineCreationPayload(
      createPayload,
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
      ledgers,
      dimensionTypesMap,
      accountService,
    );

    analyticalToCreate.push(...analyticalData);

    // Setup data for prices (PORDERP)
    const pricePayload = await buildPurchaseOrderPriceCreationPayload(
      createPayload,
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

  // Calculate sales order totals
  const totals = calculatePurchaseOrderTotals(linesToCreate, [
    'lineAmountIncludingTax',
    'taxExcludedLineAmount',
    'quantityInOrderUnitOrdered',
    'tax1amount',
    'linePurchaseCostInCompanyCurrency',
  ]);

  const rate = createPayload.currencyRate as Prisma.Decimal.Value;
  const taxInCompanyCurrency = totals.tax1amount.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
  const amountIncludingTaxInCompanyCurrency = totals.linePurchaseCostInCompanyCurrency
    .add(taxInCompanyCurrency)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
}
