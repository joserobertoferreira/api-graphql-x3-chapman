import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CompanyResolver } from './company.resolver';
import { CompanyService } from './company.service';

@Module({
  imports: [PrismaModule],
  providers: [CompanyResolver, CompanyService],
})
export class CompanyModule {}
