import { LocalMenus } from '@chapman/utils';
import { LineStatusGQL, OrderStatusGQL } from '../registers/enum-register';

export const localMenuOrderStatusToGqlEnum: Record<LocalMenus.OrderStatus, OrderStatusGQL> = {
  [LocalMenus.OrderStatus.OPEN]: OrderStatusGQL.open,
  [LocalMenus.OrderStatus.CLOSED]: OrderStatusGQL.closed,
};

export const localMenuLineStatusToGqlEnum: Record<LocalMenus.LineStatus, LineStatusGQL> = {
  [LocalMenus.LineStatus.PENDING]: LineStatusGQL.pending,
  [LocalMenus.LineStatus.LATE]: LineStatusGQL.late,
  [LocalMenus.LineStatus.CLOSED]: LineStatusGQL.closed,
};
