import { UpdatedSalesOrderLinkedWithPurchaseOrder } from '../../../common/types/purchase-order.types';

/**
 * Represents the event that is emitted when an Intercompany Purchase Order has been successfully created.
 *
 * Its responsibility is to update the original Sales Order (SO).
 */
export class SalesOrderUpdatedEvent {
  constructor(
    /**
     * An object representing the complete Sales Order that was created,
     * including its lines.
     */
    public readonly purchaseOrder: UpdatedSalesOrderLinkedWithPurchaseOrder,

    /**
     * The Prisma transaction ID, if a listener needs to join
     * the same transaction. (This is an advanced pattern, but useful to have).
     */
    public readonly transactionId?: string, // Optional
  ) {}
}
