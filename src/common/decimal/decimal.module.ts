import { Global, Module } from '@nestjs/common';
import { DecimalConverter } from './decimal.converter';

@Global()
@Module({
  providers: [DecimalConverter],
  exports: [DecimalConverter],
})
export class DecimalModule {}
