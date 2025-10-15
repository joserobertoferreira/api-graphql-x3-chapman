import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { AnalyticalAccountingLines } from '../../../generated/prisma';
import { PurchaseOrderCreatedEvent } from '../../purchase-order/events/purchase-order-created.event';
import { CreateSalesOrderInput } from '../dto/create-sales-order.input';
import { SalesOrderService } from '../sales-order.service';

const DIMENSION_MAPPING_CONFIG = [
  { dtoField: 'fixture', typeCode: 'FIX', position: 1 },
  { dtoField: 'broker', typeCode: 'BRK', position: 2 },
  { dtoField: 'department', typeCode: 'DEP', position: 3 },
  { dtoField: 'location', typeCode: 'LOC', position: 4 },
  { dtoField: 'type', typeCode: 'TYP', position: 5 },
  { dtoField: 'product', typeCode: 'PDT', position: 6 },
  { dtoField: 'analysis', typeCode: 'ANA', position: 7 },
];

/**
 * Mapeia os dados de uma linha analítica para o formato do DTO DimensionsInput.
 * @param analyticsData - O objeto da AnalyticalAccountingLines.
 * @returns Um objeto DimensionsInput preenchido.
 */
function mapAnalyticsToDimensionsInput(analyticsData: AnalyticalAccountingLines | undefined): DimensionsInput {
  const dimensionsInput: DimensionsInput = {};

  if (!analyticsData) {
    return dimensionsInput;
  }

  // 2. ITERE sobre a nossa configuração
  for (const config of DIMENSION_MAPPING_CONFIG) {
    const { dtoField, typeCode, position } = config;

    // Construa os nomes das colunas dinamicamente
    const typeKey = `dimensionType${position}` as keyof AnalyticalAccountingLines;
    const valueKey = `dimension${position}` as keyof AnalyticalAccountingLines;

    // 3. VERIFIQUE se o tipo na linha analítica corresponde ao que esperamos
    if (analyticsData[typeKey] === typeCode) {
      const value = analyticsData[valueKey] as string;

      // 4. Se corresponder, preencha o campo correto no nosso DTO de resultado
      if (value) {
        dimensionsInput[dtoField] = value;
      }
    }
  }

  return dimensionsInput;
}

@Injectable()
export class PurchaseOrderListener {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  /**
   * This method "listens" for the creation event of an intercompany purchase order.
   * The @OnEvent decorator ensures it will be executed automatically.
   */
  @OnEvent('purchaseOrder.created.intercompany')
  async handlePurchaseOrderCreated(event: PurchaseOrderCreatedEvent) {
    console.log('Listener received event: purchaseOrder.created.intercompany', event);

    const { purchaseOrder } = event;

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

        const product = poLine.product;
        const quantity = poLine.quantityInPurchaseUnitOrdered.toNumber();
        const grossPrice = priceData.grossPrice.toNumber();
        const taxLevelCode = priceData.tax1;

        const dimensions = mapAnalyticsToDimensionsInput(analyticsData);

        return {
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
      salesSite: purchaseOrder.purchaseSite,
      salesOrderType: 'SOI',
      orderDate: purchaseOrder.orderDate,
      soldToCustomer: purchaseOrder.supplier,
      taxRule: purchaseOrder.taxRule,
      currency: purchaseOrder.currency,
      lines: salesOrderLines,
    };

    // Call the sales service to create the new order.
    try {
      console.log('Creating corresponding sales order...');
      const newSalesOrder = await this.salesOrderService.create(salesOrderInput, false);
      console.log(`Successfully created Sales Order ${newSalesOrder.orderNumber}.`);
    } catch (error) {
      // É CRUCIAL logar o erro aqui.
      // Como o listener corre em "fundo", um erro não irá parar a resposta original.
      console.error('Failed to create corresponding sales order from purchase order:', error);
      // Aqui você pode adicionar lógica para notificar um administrador,
      // ou colocar o evento numa "fila de falhas" para tentar novamente.
    }
  }
}
