import { Module } from '@nestjs/common';
import { PaymentTermResolver } from './payment-term.resolver';
import { PaymentTermService } from './payment-term.service';

@Module({
  providers: [PaymentTermResolver, PaymentTermService],
  exports: [PaymentTermService],
})
export class PaymentTermModule {}
