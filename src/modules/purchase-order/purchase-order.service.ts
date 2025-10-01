import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { PurchaseSequenceNumber } from '../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../common/utils/audit-date.utils';
import { calculatePrice } from '../../common/utils/sales-price.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CompanyService } from '../companies/company.service';
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

interface PurchaseOrderSequenceNumber {
  legislation: string;
  company: string;
  purchaseSite: string;
  orderDate: Date;
  complement: string;
}

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
    private readonly companyService: CompanyService,
    private readonly contextService: PurchaseOrderContextService,
    private readonly purchaseOrderViewService: PurchaseOrderViewService,
    private readonly currencyService: CurrencyService,
    private readonly accountService: AccountService,
  ) {}

  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderEntity | null> {
    // Executa a validação do contexto da encomenda
    const context = await this.contextService.buildHeaderContext(input);

    const createPayload = await buildPurchaseOrderCreationPayload(
      input,
      context.supplier,
      context.site,
      this.businessPartnerService,
      this.currencyService,
      this.parametersService,
    );

    const ledgers = context.ledgers;
    const companyCurrency = context.site.company?.accountingCurrency ?? 'EUR';

    const debug_enabled = false;

    // 2. Transação
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const site = await this.companyService.getSiteByCode(input.purchaseSite);
      const legislation = site?.legislation ?? '';

      // A. Preparar dados para as linhas (PORDERQ) e preços (PORDERP)
      let currentLineNumber = 1000;

      const linesToCreate: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[] = [];
      const pricesToCreate: Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput[] = [];
      const analyticalToCreate: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput[] = [];
      const footerToCreate: Prisma.PurchaseDocumentsFooterUncheckedCreateInput[] = [];

      for (const lineInput of input.lines) {
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

        // 1. Prepara os dados da LINHA (PORDERQ)
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

        // 2. Preparar dados de contabilidade analítica (se necessário)
        const dimensions = lineInput.dimensions || [];
        const analyticalData = await buildAnalyticalAccountingLinesPayload(dimensions, ledgers, this.accountService);

        analyticalToCreate.push(...analyticalData);

        // 3. Prepara os dados do PREÇO (PORDERP) correspondente
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

      // B. Obter o próximo número da encomenda
      if (!input.purchaseSite) {
        throw new BadRequestException('Purchase site is required.');
      }

      // C. Calcular os totais da encomenda
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

      // D. Criar o cabeçalho com os dados aninhados
      const newOrderNumber = await this.getNextOrderNumber({
        company: '',
        purchaseSite: input.purchaseSite,
        legislation: legislation,
        orderDate: input.orderDate ?? new Date(),
        complement: '',
      });

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

      if (debug_enabled) {
        console.log('Creating Purchase Order with the following data:');
        console.log('Header:', createPayload);
        console.log('Lines:', linesToCreate);
        console.log('Prices:', pricesToCreate);
        console.log('Footer:', footerToCreate);
        throw new Error('Debug mode is enabled');
      }

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

    // Retornar a encomenda criada
    return this.purchaseOrderViewService.findOne(createdOrder.orderNumber);
  }

  /**
   * Obtém o próximo número de encomenda disponível.
   */
  async getNextOrderNumber(args: PurchaseOrderSequenceNumber): Promise<string> {
    const { legislation, purchaseSite, orderDate, complement, company } = args;

    const sequenceNumbers = await this.commonService.getPurchaseOrderTypeSequenceNumber();
    if (!sequenceNumbers || sequenceNumbers.length === 0) {
      throw new Error(`Sequence number for purchase order not found.`);
    }

    let sequenceNumber: PurchaseSequenceNumber | undefined;

    // Tenta encontrar para a legislação especificada
    sequenceNumber = sequenceNumbers.find((record) => record.legislation === legislation);

    // Se não encontrar, tenta buscar para a legislação em branco
    if (!sequenceNumber) {
      console.log('No sequence number found for legislation:', legislation, 'trying default');
      sequenceNumber = sequenceNumbers.find((record) => record.legislation === '');
      console.log(sequenceNumber);
    }

    if (!sequenceNumber) {
      throw new NotFoundException(`No applicable sequence number found for legislation ${legislation} or default.`);
    }

    // Obtém o próximo valor do contador para o tipo de ordem
    const nextCounterValue = await this.sequenceNumberService.getNextCounter(
      sequenceNumber.counter,
      company,
      purchaseSite,
      orderDate,
      complement,
    );

    return nextCounterValue;
  }
}
