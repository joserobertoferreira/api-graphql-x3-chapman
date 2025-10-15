import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { AccountModule } from '../../common/services/account.module';
import { CommonModule } from '../../common/services/common.module';
import { CurrencyModule } from '../../common/services/currency.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CompanyModule } from '../companies/company.module';
import { CustomerModule } from '../customers/customer.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { DimensionModule } from '../dimensions/dimension.module';
import { ProductModule } from '../products/product.module';
import { SiteModule } from '../sites/site.module';
import { PurchaseOrderListener } from './listeners/purchase-order.listener';
import { SalesOrderContextService } from './sales-order-context.service';
import { SalesOrderLineResolver } from './sales-order-line.resolver';
import { SalesOrderStatusResolver } from './sales-order-status.resolver';
import { SalesOrderStatusService } from './sales-order-status.service';
import { SalesOrderViewService } from './sales-order-view.service';
import { SalesOrderResolver } from './sales-order.resolver';
import { SalesOrderService } from './sales-order.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CounterModule),
    forwardRef(() => ParametersModule),
    forwardRef(() => CommonModule),
    forwardRef(() => CurrencyModule),
    forwardRef(() => ValidatorsModule),
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => SiteModule),
    forwardRef(() => AccountModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => ProductModule),
    forwardRef(() => DimensionTypeModule),
    forwardRef(() => DimensionModule),
  ],
  providers: [
    SalesOrderResolver,
    SalesOrderService,
    SalesOrderViewService,
    SalesOrderLineResolver,
    SalesOrderContextService,
    SalesOrderStatusService,
    SalesOrderStatusResolver,
    PurchaseOrderListener,
  ],
})
export class SalesOrderModule {}
