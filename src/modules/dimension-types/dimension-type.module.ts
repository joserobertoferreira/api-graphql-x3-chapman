import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DimensionTypeResolver } from './dimension-type.resolver';
import { DimensionTypeService } from './dimension-type.service';

@Module({
  imports: [PrismaModule],
  providers: [DimensionTypeResolver, DimensionTypeService],
  exports: [DimensionTypeService],
})
export class DimensionTypeModule {}
