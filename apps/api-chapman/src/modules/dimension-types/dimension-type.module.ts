import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DimensionTypeConfigService } from './dimension-type-config.service';
import { DimensionTypeResolver } from './dimension-type.resolver';
import { DimensionTypeService } from './dimension-type.service';

@Module({
  imports: [PrismaModule],
  providers: [DimensionTypeResolver, DimensionTypeService, DimensionTypeConfigService],
  exports: [DimensionTypeService, DimensionTypeConfigService],
})
export class DimensionTypeModule {}
