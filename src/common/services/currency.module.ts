import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CurrencyService } from './currency.service';

@Module({
  imports: [PrismaModule],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
