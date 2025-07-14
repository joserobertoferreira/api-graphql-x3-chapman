import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DimensionsValidator } from './dimensions.validator';

@Module({
  imports: [PrismaModule],
  providers: [DimensionsValidator],
  exports: [DimensionsValidator],
})
export class ValidatorsModule {}
