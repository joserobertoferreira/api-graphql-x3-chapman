import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentTermResolver } from './payment-term.resolver';
import { PaymentTermService } from './payment-term.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentTermResolver, PaymentTermService],
  exports: [PaymentTermService],
})
export class PaymentTermModule {}
