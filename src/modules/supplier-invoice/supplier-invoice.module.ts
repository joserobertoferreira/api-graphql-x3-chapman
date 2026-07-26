import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { AccountModule } from '../../common/services/account.module';
import { CommonJournalEntryModule } from '../../common/services/common-journal-entry.module';
import { CommonSupplierInvoiceService } from '../../common/services/common-supplier-invoice.service';
import { CurrencyModule } from '../../common/services/currency.module';
import { SiteCompanyGroupModule } from '../../common/services/site-company-group.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { AddressModule } from '../addresses/address.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CommonModule } from '../common/common.module';
import { CompanyModule } from '../companies/company.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { DimensionModule } from '../dimensions/dimension.module';
import { SupplierModule } from '../suppliers/supplier.module';
import { UserModule } from '../users/user.module';
import { SupplierInvoiceLineTaxService } from './services/supplier-invoice-line-tax.service';
import { SupplierInvoiceLineResolver, SupplierInvoiceResolver } from './supplier-invoice.resolver';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierInvoiceValidationService } from './validators/supplier-invoice-validation.service';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => CounterModule),
    forwardRef(() => ParametersModule),
    forwardRef(() => CommonModule),
    forwardRef(() => AccountModule),
    forwardRef(() => CurrencyModule),
    forwardRef(() => ValidatorsModule),
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => SupplierModule),
    forwardRef(() => DimensionTypeModule),
    forwardRef(() => DimensionModule),
    forwardRef(() => SiteCompanyGroupModule),
    forwardRef(() => CommonJournalEntryModule),
    forwardRef(() => AddressModule),
  ],
  providers: [
    SupplierInvoiceResolver,
    SupplierInvoiceLineResolver,
    SupplierInvoiceService,
    SupplierInvoiceValidationService,
    SupplierInvoiceLineTaxService,
    CommonSupplierInvoiceService,
  ],
})
export class SupplierInvoiceModule {}
