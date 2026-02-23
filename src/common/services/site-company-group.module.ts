import { forwardRef, Module } from '@nestjs/common';
import { CompanyModule } from '../../modules/companies/company.module';
import { SiteModule } from '../../modules/sites/site.module';
import { SiteCompanyGroupService } from './site-company-group.service';

@Module({
  imports: [forwardRef(() => SiteModule), forwardRef(() => CompanyModule)],
  providers: [SiteCompanyGroupService],
  exports: [SiteCompanyGroupService],
})
export class SiteCompanyGroupModule {}
