import { Module, forwardRef } from '@nestjs/common';
import { AddressModule } from '../addresses/address.module';
import { CompanyResolver } from './company.resolver';
import { CompanyService } from './company.service';

@Module({
  imports: [forwardRef(() => AddressModule)],
  providers: [CompanyResolver, CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
