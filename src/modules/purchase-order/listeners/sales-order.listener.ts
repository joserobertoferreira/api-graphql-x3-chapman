import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PurchaseOrderUpdatedEvent } from '../../sales-order/events/purchase-order-updated.event';
import { SalesOrderCreatedEvent } from '../../sales-order/events/sales-order-created.event';
import { SalesOrderUpdatedEvent } from '../events/sales-order-updated.event';
import { PurchaseOrderService } from '../purchase-order.service';

@Injectable()
export class SalesOrderListener {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * This method "listens" for the creation event of an intercompany sales order.
   * The @OnEvent decorator ensures it will be executed automatically.
   */
  @OnEvent('salesOrder.created.intercompany')
  async handleSalesOrderCreated(event: SalesOrderCreatedEvent) {
    console.log('PurchaseOrderModule received event: salesOrder.created.intercompany', event.salesOrder.orderNumber);

    const { salesOrder } = event;
    const { intersiteContext } = salesOrder;

    if (!intersiteContext || !intersiteContext.isIntersite) {
      console.log(
        `Sales Order ${salesOrder.orderNumber} is not marked as intercompany. Skipping Purchase Order creation.`,
      );
      return;
    }

    // Call the sales service to create the new order.
    try {
      console.log('Creating corresponding purchase order...');
      const newPurchaseOrder = await this.purchaseOrderService.createPurchaseOrderFromSalesOrder(
        salesOrder,
        intersiteContext,
      );
      if (newPurchaseOrder) {
        console.log('Update sales order:', newPurchaseOrder.orderNumber);

        const salesOrderUpdatedEvent = new SalesOrderUpdatedEvent({
          orderNumber: salesOrder.orderNumber,
          purchaseOrder: newPurchaseOrder,
        });

        // Emit the updated event
        this.eventEmitter.emit('salesOrder.updated.intercompany', salesOrderUpdatedEvent);
      }
    } catch (error) {
      // É CRUCIAL logar o erro aqui.
      // Como o listener corre em "fundo", um erro não irá parar a resposta original.
      console.error('Failed to create corresponding purchase order from sales order:', error);
      // Aqui você pode adicionar lógica para notificar um administrador,
      // ou colocar o evento numa "fila de falhas" para tentar novamente.
    }
  }

  /**
   * This method "listens" for the creation event of an intercompany sales order.
   * The @OnEvent decorator ensures it will be executed automatically.
   */
  @OnEvent('purchaseOrder.updated.intercompany')
  async handlePurchaseOrderUpdated(event: PurchaseOrderUpdatedEvent) {
    console.log('SalesOrderModule received event: purchaseOrder.updated.intercompany', event.salesOrder.orderNumber);

    try {
      console.log('Updating purchase order...');
      await this.purchaseOrderService.updatePurchaseOrderFromSalesOrder(event.salesOrder);
      console.log('Successfully updated purchase order.');
    } catch (error) {
      console.error('Failed to update purchase order:', error);
    }
  }
}
