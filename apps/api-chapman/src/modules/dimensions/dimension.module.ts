import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { TranslateTextModule } from '../../common/translate/translate-text.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { CompanyModule } from '../companies/company.module';
import { CustomerModule } from '../customers/customer.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { SiteModule } from '../sites/site.module';
import { DimensionContextService } from './dimension-context.service';
import { DimensionResolver } from './dimension.resolver';
import { DimensionService } from './dimension.service';
import { BrokerDimensionStrategy } from './strategies/broker-dimension.strategy';
import { DimensionStrategyFactory } from './strategies/dimension-strategy.factory';
import { FixtureDimensionStrategy } from './strategies/fixture-dimension.strategy';
import { GeneralDimensionStrategy } from './strategies/general-dimension.strategy';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => DimensionTypeModule),
    forwardRef(() => ValidatorsModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => SiteModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => CommonModule),
    forwardRef(() => TranslateTextModule),
  ],
  providers: [
    DimensionService,
    DimensionResolver,
    DimensionContextService,
    DimensionStrategyFactory,
    GeneralDimensionStrategy,
    { provide: 'FixtureDimensionStrategy', useClass: FixtureDimensionStrategy },
    { provide: 'BrokerDimensionStrategy', useClass: BrokerDimensionStrategy },
  ],
  exports: [DimensionService, DimensionContextService, DimensionStrategyFactory],
})
export class DimensionModule {}
