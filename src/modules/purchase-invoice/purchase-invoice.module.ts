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
import { PurchaseInvoiceViewService } from './purchase-invoice-view.service';
import { PurchaseInvoiceResolver } from './purchase-invoice.resolver';

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
  providers: [PurchaseInvoiceResolver, PurchaseInvoiceViewService],
})
export class PurchaseInvoiceModule {}
