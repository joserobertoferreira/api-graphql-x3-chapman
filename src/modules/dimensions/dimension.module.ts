import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DimensionResolver } from './dimension.resolver';
import { DimensionService } from './dimension.service';

@Module({
  imports: [PrismaModule],
  providers: [DimensionService, DimensionResolver],
  exports: [DimensionService],
})
export class DimensionModule {}
