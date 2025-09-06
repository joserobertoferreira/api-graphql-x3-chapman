import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { CurrencyRateResolver } from './currency-rate.resolver';
import { CurrencyRateService } from './currency-rate.service';

@Module({
  imports: [PrismaModule, forwardRef(() => ValidatorsModule), forwardRef(() => CommonModule)],
  providers: [CurrencyRateService, CurrencyRateResolver],
  exports: [CurrencyRateService],
})
export class CurrencyRateModule {}
