import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
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

interface SalesOrderSequenceNumber {
  orderType: string;
  legislation: string;
  company: string;
  salesSite: string;
  orderDate: Date;
  complement: string;
}

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

  async create(input: CreateSalesOrderInput): Promise<SalesOrderEntity | null> {
    // Executa a validação do contexto da encomenda
    const context = await this.contextService.buildHeaderContext(input);

    const createPayload = await buildSalesOrderCreationPayload(
      input,
      context.customer,
      context.site,
      this.businessPartnerService,
      this.commonService,
      this.currencyService,
      this.parametersService,
    );

    const debug = true;

    const ledgers = context.ledgers;

    // 2. Database transaction
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
        const analyticalData = await buildAnalyticalAccountingLinesPayload(
          createPayload,
          lineInput,
          ledgers,
          this.accountService,
        );

        analyticalToCreate.push(...analyticalData);

        // 3. Prepara os dados do PREÇO (SORDERP) correspondente
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

      // B. Obter o próximo número da encomenda
      const newOrderNumber = await this.getNextOrderNumber({
        orderType: context.salesOrderType.orderType,
        company: '',
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

    // Retornar a encomenda criada
    return this.salesOrderViewService.findOne(createdOrder.orderNumber);
  }

  /**
   * Salda a linha da encomenda e atualiza o status da encomenda.
   * @param input Objeto contendo os dados necessários para identificar e fechar uma linha de encomenda de venda.
   * @returns Promise<SalesOrderLineEntity> A linha da encomenda atualizada.
   */
  async closeSalesOrderLines(input: CloseSalesOrderLineInput): Promise<SalesOrderLineEntity[]> {
    const { orderNumber, lines: lineNumbers } = input;

    if (!lineNumbers || lineNumbers.length === 0) {
      throw new BadRequestException('At least one line number is required.');
    }

    // 1. Verifica se a encomenda e as linhas existem
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

    // Verifica se o status da encomenda permite que seja cancelada
    const status = await this.prisma.salesOrder.findUnique({
      where: { orderNumber: orderNumber },
      select: { accountingValidationStatus: true },
    });

    if (status?.accountingValidationStatus !== 2) {
      throw new BadRequestException('Accounting Order status does not allow cancellation.');
    }

    const updatedLines = await this.prisma.$transaction(async (tx) => {
      // 2. Atualiza o status da linha da encomenda
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

      // 3. Atualiza o status da encomenda se todas as linhas estiverem fechadas
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

      // 5. Busca os dados completos das linhas atualizadas
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
   * Obtém o próximo número de encomenda disponível.
   */
  async getNextOrderNumber(args: SalesOrderSequenceNumber): Promise<string> {
    const { orderType, salesSite, orderDate, complement, company } = args;

    const sequenceNumber = await this.commonService.getSalesOrderTypeSequenceNumber(orderType);
    if (!sequenceNumber) {
      throw new Error(`Sequence number for order type ${orderType} not found.`);
    }

    // Obtém o próximo valor do contador para o tipo de ordem
    const nextCounterValue = await this.sequenceNumberService.getNextCounter(
      sequenceNumber,
      company,
      salesSite,
      orderDate,
      complement,
    );

    return nextCounterValue;
  }
}
