import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanyModule } from '../companies/company.module';
import { BusinessPartnerService } from './business-partner.service';

@Module({
  imports: [PrismaModule, forwardRef(() => CompanyModule)],
  providers: [BusinessPartnerService],
  exports: [BusinessPartnerService],
})
export class BusinessPartnerModule {}
