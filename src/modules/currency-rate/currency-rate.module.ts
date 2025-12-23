import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CurrencyRateResolver } from './currency-rate.resolver';
import { CurrencyRateService } from './currency-rate.service';

@Module({
  imports: [PrismaModule],
  providers: [CurrencyRateService, CurrencyRateResolver],
  exports: [CurrencyRateService],
})
export class CurrencyRateModule {}
