import { UpdatedPurchaseOrderLinkedWithSalesOrder } from '../../../common/types/sales-order.types';

/**
 * Represents the event that is emitted when an Intercompany Sales Order has been successfully created.
 *
 * Its responsibility is to update the original Purchase Order (PO).
 */
export class PurchaseOrderUpdatedEvent {
  constructor(
    /**
     * An object representing the complete Sales Order that was created,
     * including its lines.
     */
    public readonly salesOrder: UpdatedPurchaseOrderLinkedWithSalesOrder,

    /**
     * The Prisma transaction ID, if a listener needs to join
     * the same transaction. (This is an advanced pattern, but useful to have).
     */
    public readonly transactionId?: string, // Optional
  ) {}
}
