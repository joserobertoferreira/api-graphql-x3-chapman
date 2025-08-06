import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { CommonModule } from '../../common/services/common.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CompanyModule } from '../companies/company.module';
import { CustomerModule } from '../customers/customer.module';
import { ProductModule } from '../products/product.module';
import { SalesOrderContextService } from './sales-order-context.service';
import { SalesOrderLineResolver } from './sales-order-line.resolver';
import { SalesOrderViewService } from './sales-order-view.service';
import { SalesOrderResolver } from './sales-order.resolver';
import { SalesOrderService } from './sales-order.service';

@Module({
  imports: [
    PrismaModule,
    CounterModule,
    ParametersModule,
    CommonModule,
    ValidatorsModule,
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => ProductModule),
  ],
  providers: [
    SalesOrderResolver,
    SalesOrderService,
    SalesOrderViewService,
    SalesOrderLineResolver,
    SalesOrderContextService,
  ],
})
export class SalesOrderModule {}
