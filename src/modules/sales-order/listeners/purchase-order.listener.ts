import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PurchaseOrderCreatedEvent } from '../../purchase-order/events/purchase-order-created.event';
import { SalesOrderUpdatedEvent } from '../../purchase-order/events/sales-order-updated.event';
import { PurchaseOrderUpdatedEvent } from '../events/purchase-order-updated.event';
import { SalesOrderService } from '../sales-order.service';

@Injectable()
export class PurchaseOrderListener {
  constructor(
    private readonly salesOrderService: SalesOrderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * This method "listens" for the creation event of an intercompany purchase order.
   * The @OnEvent decorator ensures it will be executed automatically.
   */
  @OnEvent('purchaseOrder.created.intercompany')
  async handlePurchaseOrderCreated(event: PurchaseOrderCreatedEvent) {
    console.log('Listener received event: purchaseOrder.created.intercompany', event.purchaseOrder.orderNumber);

    const { purchaseOrder } = event;
    const { intersiteContext } = purchaseOrder;

    if (!intersiteContext || !intersiteContext.isIntersite) {
      console.log(
        `Purchase Order ${purchaseOrder.orderNumber} is not marked as intercompany. Skipping Sales Order creation.`,
      );
      return;
    }

    // Call the sales service to create the new order.
    try {
      console.log('Creating corresponding sales order...');
      const newSalesOrder = await this.salesOrderService.createSalesOrderFromPurchaseOrder(
        purchaseOrder,
        intersiteContext,
      );
      if (newSalesOrder) {
        console.log('Update purchase order:', purchaseOrder.orderNumber);

        const purchaseOrderUpdatedEvent = new PurchaseOrderUpdatedEvent({
          orderNumber: purchaseOrder.orderNumber,
          salesOrder: newSalesOrder,
        });

        // Emit the updated event
        this.eventEmitter.emit('purchaseOrder.updated.intercompany', purchaseOrderUpdatedEvent);
      }
    } catch (error) {
      // É CRUCIAL logar o erro aqui.
      // Como o listener corre em "fundo", um erro não irá parar a resposta original.
      console.error('Failed to create corresponding sales order from purchase order:', error);
      // Aqui você pode adicionar lógica para notificar um administrador,
      // ou colocar o evento numa "fila de falhas" para tentar novamente.
    }
  }

  /**
   * This method "listens" for the creation event of an intercompany purchase order.
   * The @OnEvent decorator ensures it will be executed automatically.
   */
  @OnEvent('salesOrder.updated.intercompany')
  async handleSalesOrderUpdated(event: SalesOrderUpdatedEvent) {
    console.log('PurchaseOrderModule received event: salesOrder.updated.intercompany', event.purchaseOrder.orderNumber);

    try {
      console.log('Updating sales order...');
      await this.salesOrderService.updateSalesOrderFromPurchaseOrder(event.purchaseOrder);
      console.log('Successfully updated sales order.');
    } catch (error) {
      console.error('Failed to update sales order:', error);
    }
  }
}
