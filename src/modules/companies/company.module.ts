import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddressModule } from '../addresses/address.module';
import { CompanyResolver } from './company.resolver';
import { CompanyService } from './company.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AddressModule)],
  providers: [CompanyResolver, CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
