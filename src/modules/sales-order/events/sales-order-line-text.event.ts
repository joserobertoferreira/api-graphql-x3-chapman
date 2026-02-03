import { ICreatedDocumentWithLines, ICreateDocumentLineText } from '../../../common/types/document-text.types';

/**
 * Represents the event that is emitted when an Sales Order
 * is successfully created.
 *
 * It carries the necessary data payload for listeners to act upon.
 */
export class SalesOrderLineTextEvent {
  /**
   * The original document number
   */
  public readonly documentNumber: string;

  /**
   * The original input lines used to create the sales order.
   * This can be useful for listeners that need to reference
   * the initial request data.
   */
  public readonly inputLines: ICreateDocumentLineText[];

  constructor(event: ICreatedDocumentWithLines) {
    this.documentNumber = event.documentNumber;
    this.inputLines = event.documentLines;
  }
}
