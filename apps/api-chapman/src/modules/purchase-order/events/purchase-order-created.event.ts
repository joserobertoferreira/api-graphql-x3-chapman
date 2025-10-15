import { PurchaseOrderWithLines } from '../../../common/types/purchase-order.types';

/**
 * Represents the event that is emitted when an Intercompany Purchase Order
 * is successfully created.
 *
 * It carries the necessary data payload for listeners to act upon.
 */
export class PurchaseOrderCreatedEvent {
  constructor(
    /**
     * An object representing the complete Purchase Order that was created,
     * including its lines.
     */
    public readonly purchaseOrder: PurchaseOrderWithLines,

    /**
     * The Prisma transaction ID, if a listener needs to join
     * the same transaction. (This is an advanced pattern, but useful to have).
     */
    public readonly transactionId?: string, // Optional
  ) {}
}
