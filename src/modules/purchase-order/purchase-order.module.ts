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
import { SupplierModule } from '../suppliers/supplier.module';
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
  ],
})
export class PurchaseOrderModule {}
