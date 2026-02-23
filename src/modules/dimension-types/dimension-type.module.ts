import { Module } from '@nestjs/common';
import { DimensionTypeConfigService } from './dimension-type-config.service';
import { DimensionTypeResolver } from './dimension-type.resolver';
import { DimensionTypeService } from './dimension-type.service';

@Module({
  providers: [DimensionTypeResolver, DimensionTypeService, DimensionTypeConfigService],
  exports: [DimensionTypeService, DimensionTypeConfigService],
})
export class DimensionTypeModule {}
