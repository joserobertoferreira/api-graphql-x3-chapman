import { ExchangeRateTypeGQL } from '../../registers/enum-register';
import { LocalMenus } from './local-menu';

export const ExchangeRateTypeToExchangeRateTypeGQL: Record<LocalMenus.ExchangeRateType, ExchangeRateTypeGQL> = {
  [LocalMenus.ExchangeRateType.DAILY_RATE]: ExchangeRateTypeGQL.dailyRate,
  [LocalMenus.ExchangeRateType.MONTHLY_RATE]: ExchangeRateTypeGQL.monthlyRate,
  [LocalMenus.ExchangeRateType.AVERAGE_RATE]: ExchangeRateTypeGQL.averageRate,
  [LocalMenus.ExchangeRateType.CUSTOMS_DOC_FILE_EXCHANGE]: ExchangeRateTypeGQL.customsDocFileExchange,
};

export const ExchangeRateTypeGQLToExchangeRateType: Record<ExchangeRateTypeGQL, LocalMenus.ExchangeRateType> = {
  [ExchangeRateTypeGQL.dailyRate]: LocalMenus.ExchangeRateType.DAILY_RATE,
  [ExchangeRateTypeGQL.monthlyRate]: LocalMenus.ExchangeRateType.MONTHLY_RATE,
  [ExchangeRateTypeGQL.averageRate]: LocalMenus.ExchangeRateType.AVERAGE_RATE,
  [ExchangeRateTypeGQL.customsDocFileExchange]: LocalMenus.ExchangeRateType.CUSTOMS_DOC_FILE_EXCHANGE,
};
