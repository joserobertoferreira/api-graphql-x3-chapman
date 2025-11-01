import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CompanyModule } from '../../modules/companies/company.module';
import { SiteModule } from '../../modules/sites/site.module';
import { SiteCompanyGroupService } from './site-company-group.service';

@Module({
  imports: [PrismaModule, forwardRef(() => SiteModule), forwardRef(() => CompanyModule)],
  providers: [SiteCompanyGroupService],
  exports: [SiteCompanyGroupService],
})
export class SiteCompanyGroupModule {}
