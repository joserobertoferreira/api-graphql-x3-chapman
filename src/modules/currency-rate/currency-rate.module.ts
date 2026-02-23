import { Module } from '@nestjs/common';
import { CurrencyRateResolver } from './currency-rate.resolver';
import { CurrencyRateService } from './currency-rate.service';

@Module({
  providers: [CurrencyRateService, CurrencyRateResolver],
  exports: [CurrencyRateService],
})
export class CurrencyRateModule {}
