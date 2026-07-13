import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { AccountModule } from '../../common/services/account.module';
import { CurrencyModule } from '../../common/services/currency.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CommonModule } from '../common/common.module';
import { CompanyModule } from '../companies/company.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { DimensionModule } from '../dimensions/dimension.module';
import { SiteModule } from '../sites/site.module';
import { SupplierModule } from '../suppliers/supplier.module';
import { SupplierInvoiceLineResolver, SupplierInvoiceResolver } from './supplier-invoice.resolver';
import { SupplierInvoiceService } from './supplier-invoice.service';

@Module({
  imports: [
    forwardRef(() => CounterModule),
    forwardRef(() => ParametersModule),
    forwardRef(() => CommonModule),
    forwardRef(() => CurrencyModule),
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => SiteModule),
    forwardRef(() => AccountModule),
    forwardRef(() => SupplierModule),
    forwardRef(() => DimensionTypeModule),
    forwardRef(() => DimensionModule),
  ],
  providers: [SupplierInvoiceResolver, SupplierInvoiceLineResolver, SupplierInvoiceService],
})
export class SupplierInvoiceModule {}
