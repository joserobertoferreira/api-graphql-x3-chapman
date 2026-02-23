import { forwardRef, Module } from '@nestjs/common';
import { CompanyModule } from '../companies/company.module';
import { BusinessPartnerService } from './business-partner.service';

@Module({
  imports: [forwardRef(() => CompanyModule)],
  providers: [BusinessPartnerService],
  exports: [BusinessPartnerService],
})
export class BusinessPartnerModule {}
