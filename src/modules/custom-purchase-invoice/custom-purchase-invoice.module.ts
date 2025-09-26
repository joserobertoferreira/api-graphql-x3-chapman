import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { CompanyModule } from '../companies/company.module';
import { CustomerModule } from '../customers/customer.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { DimensionModule } from '../dimensions/dimension.module';
import { SiteModule } from '../sites/site.module';
import { CustomPurchaseInvoiceViewService } from './custom-purchase-invoice-view.service';
import { CustomPurchaseInvoiceResolver } from './custom-purchase-invoice.resolver';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => DimensionTypeModule),
    forwardRef(() => DimensionModule),
    forwardRef(() => ValidatorsModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => SiteModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => CommonModule),
  ],
  providers: [CustomPurchaseInvoiceViewService, CustomPurchaseInvoiceResolver],
  exports: [CustomPurchaseInvoiceViewService, CustomPurchaseInvoiceResolver],
})
export class CustomPurchaseInvoiceModule {}
