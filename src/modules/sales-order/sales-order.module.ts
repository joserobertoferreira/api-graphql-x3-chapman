import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { CommonModule } from '../../common/services/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CompanyModule } from '../companies/company.module';
import { CustomerModule } from '../customers/customer.module';
import { ProductModule } from '../products/product.module';
import { SalesOrderLineResolver } from './sales-order-line.resolver';
import { SalesOrderResolver } from './sales-order.resolver';
import { SalesOrderService } from './sales-order.service';

@Module({
  imports: [
    PrismaModule,
    CounterModule,
    ParametersModule,
    CommonModule,
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => ProductModule),
  ],
  providers: [SalesOrderResolver, SalesOrderService, SalesOrderLineResolver],
})
export class SalesOrderModule {}
