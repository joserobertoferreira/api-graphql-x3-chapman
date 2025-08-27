import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { CommonModule } from '../../common/services/common.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CompanyModule } from '../companies/company.module';
import { ProductModule } from '../products/product.module';
import { SupplierModule } from '../suppliers/supplier.module';
import { PurchaseOrderContextService } from './purchase-order-context.service';
import { PurchaseOrderLineResolver } from './purchase-order-line.resolver';
import { PurchaseOrderViewService } from './purchase-order-view.service';
import { PurchaseOrderResolver } from './purchase-order.resolver';
import { PurchaseOrderService } from './purchase-order.service';

@Module({
  imports: [
    PrismaModule,
    CounterModule,
    ParametersModule,
    CommonModule,
    ValidatorsModule,
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => SupplierModule),
    forwardRef(() => ProductModule),
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
