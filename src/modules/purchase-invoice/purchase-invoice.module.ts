import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from 'src/common/counter/counter.module';
import { ParametersModule } from 'src/common/parameters/parameter.module';
import { ValidatorsModule } from 'src/common/validators/validators.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CommonModule } from '../common/common.module';
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
    forwardRef(() => CommonModule),
    forwardRef(() => ValidatorsModule),
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => SupplierModule),
    forwardRef(() => ProductModule),
  ],
  providers: [PurchaseInvoiceResolver, PurchaseInvoiceViewService],
})
export class PurchaseInvoiceModule {}
