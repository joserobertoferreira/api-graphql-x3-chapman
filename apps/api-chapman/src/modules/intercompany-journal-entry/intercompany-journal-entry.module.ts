import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from '../../common/counter/counter.module';
import { ParametersModule } from '../../common/parameters/parameter.module';
import { AccountModule } from '../../common/services/account.module';
import { CommonJournalEntryModule } from '../../common/services/common-journal-entry.module';
import { CommonModule } from '../../common/services/common.module';
import { CurrencyModule } from '../../common/services/currency.module';
import { SiteCompanyGroupModule } from '../../common/services/site-company-group.module';
import { ValidatorsModule } from '../../common/validators/validators.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessPartnerModule } from '../business-partners/business-partner.module';
import { CompanyModule } from '../companies/company.module';
import { DimensionTypeModule } from '../dimension-types/dimension-type.module';
import { DimensionModule } from '../dimensions/dimension.module';
import { JournalEntryModule } from '../journal-entry/journal-entry.module';
import { SupplierModule } from '../suppliers/supplier.module';
import { IntercompanyJournalEntryResolver } from './intercompany-journal-entry.resolver';
import { IntercompanyJournalEntryService } from './intercompany-journal-entry.service';
import { IntercompanyJournalEntryValidationService } from './validators/intercompany-journal-entry-validation.service';

@Module({
  imports: [
    PrismaModule,
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
    forwardRef(() => JournalEntryModule),
  ],
  providers: [
    IntercompanyJournalEntryResolver,
    IntercompanyJournalEntryValidationService,
    IntercompanyJournalEntryService,
  ],
})
export class IntercompanyJournalEntryModule {}
