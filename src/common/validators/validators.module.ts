import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountModule } from '../services/account.module';
import { CommonModule } from '../services/common.module';
import { CurrencyModule } from '../services/currency.module';
import { CurrencyValidator } from './common.validator';
import { CompanySiteValidator, CompanyValidator } from './company.validator';
import { DimensionsValidator } from './dimensions.validator';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CommonModule),
    forwardRef(() => AccountModule),
    forwardRef(() => CurrencyModule),
  ],
  providers: [DimensionsValidator, CompanyValidator, CompanySiteValidator, CurrencyValidator],
  exports: [DimensionsValidator, CompanyValidator, CompanySiteValidator, CurrencyValidator],
})
export class ValidatorsModule {}
