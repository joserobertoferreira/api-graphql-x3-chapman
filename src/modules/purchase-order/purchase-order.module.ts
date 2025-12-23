import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from 'src/common/counter/counter.module';
import { ParametersModule } from 'src/common/parameters/parameter.module';
import { AccountModule } from 'src/common/services/account.module';
import { CurrencyModule } from 'src/common/services/currency.module';
import { ValidatorsModule } from 'src/common/validators/validators.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CommonModule } from '../common/common.module';
import { CompanyModule } from '../companies/company.module';
import { CustomerModule } from '../customers/customer.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { DimensionModule } from '../dimensions/dimension.module';
import { ProductModule } from '../products/product.module';
import { SiteModule } from '../sites/site.module';
import { SupplierModule } from '../suppliers/supplier.module';
import { SalesOrderListener } from './listeners/sales-order.listener';
import { PurchaseOrderContextService } from './purchase-order-context.service';
import { PurchaseOrderLineResolver } from './purchase-order-line.resolver';
import { PurchaseOrderViewService } from './purchase-order-view.service';
import { PurchaseOrderResolver } from './purchase-order.resolver';
import { PurchaseOrderService } from './purchase-order.service';

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
    forwardRef(() => SupplierModule),
    forwardRef(() => ProductModule),
    forwardRef(() => DimensionTypeModule),
    forwardRef(() => DimensionModule),
  ],
  providers: [
    PurchaseOrderResolver,
    PurchaseOrderService,
    PurchaseOrderViewService,
    PurchaseOrderLineResolver,
    PurchaseOrderContextService,
    SalesOrderListener,
  ],
})
export class PurchaseOrderModule {}
