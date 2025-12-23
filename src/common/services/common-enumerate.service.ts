import {
  ExchangeRateTypeGQL,
  InvoiceAccountingStatusGQL,
  LineStatusGQL,
  OrderStatusGQL,
} from '../registers/enum-register';
import { LocalMenus } from '../utils/enums/local-menu';

export const localMenuOrderStatusToGqlEnum: Record<LocalMenus.OrderStatus, OrderStatusGQL> = {
  [LocalMenus.OrderStatus.OPEN]: OrderStatusGQL.open,
  [LocalMenus.OrderStatus.CLOSED]: OrderStatusGQL.closed,
};

export const localMenuLineStatusToGqlEnum: Record<LocalMenus.LineStatus, LineStatusGQL> = {
  [LocalMenus.LineStatus.PENDING]: LineStatusGQL.pending,
  [LocalMenus.LineStatus.LATE]: LineStatusGQL.late,
  [LocalMenus.LineStatus.CLOSED]: LineStatusGQL.closed,
};

export const localMenuOrderAccountingStatusToGqlEnum: Record<
  LocalMenus.InvoiceAccountingStatus,
  InvoiceAccountingStatusGQL
> = {
  [LocalMenus.InvoiceAccountingStatus.NOT_POSTED]: InvoiceAccountingStatusGQL.notPosted,
  [LocalMenus.InvoiceAccountingStatus.NOT_USED]: InvoiceAccountingStatusGQL.notUsed,
  [LocalMenus.InvoiceAccountingStatus.POSTED]: InvoiceAccountingStatusGQL.posted,
};

export const localMenuExchangeRateTypeToGqlEnum: Record<LocalMenus.ExchangeRateType, ExchangeRateTypeGQL> = {
  [LocalMenus.ExchangeRateType.DAILY_RATE]: ExchangeRateTypeGQL.dailyRate,
  [LocalMenus.ExchangeRateType.MONTHLY_RATE]: ExchangeRateTypeGQL.monthlyRate,
  [LocalMenus.ExchangeRateType.AVERAGE_RATE]: ExchangeRateTypeGQL.averageRate,
  [LocalMenus.ExchangeRateType.CUSTOMS_DOC_FILE_EXCHANGE]: ExchangeRateTypeGQL.customsDocFileExchange,
};
