import { localMenuOrderStatusToGqlEnum } from '../../../common/services/common-enumerate.service';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { SalesOrderTextView } from '../../../generated/prisma/client';
import { SalesOrderLineTextEntity, SalesOrderTextEntity } from '../entities/sales-order-text.entity';

/**
 * Maps an array of SalesOrderTextView records to a single SalesOrderTextEntity.
 * Groups line data under the main order entity.
 * @param orderLinesFromView Array of view records containing order and line information
 * @returns Mapped SalesOrderTextEntity
 */
export async function mapViewToEntity(orderLinesFromView: SalesOrderTextView[]): Promise<SalesOrderTextEntity> {
  if (!orderLinesFromView || orderLinesFromView.length === 0) {
    throw new Error('No data provided to map to SalesOrderTextEntity');
  }

  // Get the first record for header information (all records have the same header data)
  const firstRecord = orderLinesFromView[0];
  const orderStatus = localMenuOrderStatusToGqlEnum[firstRecord.orderStatus as LocalMenus.OrderStatus];

  // Map line texts, filtering out null/empty line numbers
  const lineTexts: SalesOrderLineTextEntity[] = orderLinesFromView
    .filter((record) => record.lineNumber !== null && record.lineNumber !== undefined)
    .map((record) => ({
      lineNumber: record.lineNumber!,
      orderLineText: record.orderLineText || '',
    }));

  return {
    orderNumber: firstRecord.orderNumber,
    orderDate: firstRecord.orderDate,
    status: orderStatus,
    orderHeaderText: firstRecord.orderHeaderText || undefined,
    orderFooterText: firstRecord.orderFooterText || undefined,
    lineTexts: lineTexts.length > 0 ? lineTexts : undefined,
  };
}
