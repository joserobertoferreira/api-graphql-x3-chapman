import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BusinessPartnerModule } from '../../modules/business-partners/business-partner.module';
import { ParametersModule } from '../parameters/parameter.module';
import { AccountModule } from './account.module';
import { CommonJournalEntryService } from './common-journal-entry.service';
import { CommonModule } from './common.module';
import { CurrencyModule } from './currency.module';
import { SiteCompanyGroupModule } from './site-company-group.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CommonModule),
    forwardRef(() => ParametersModule),
    forwardRef(() => CurrencyModule),
    forwardRef(() => BusinessPartnerModule),
    forwardRef(() => AccountModule),
    forwardRef(() => SiteCompanyGroupModule),
  ],
  providers: [CommonJournalEntryService],
  exports: [CommonJournalEntryService],
})
export class CommonJournalEntryModule {}
