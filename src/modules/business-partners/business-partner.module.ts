import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessPartnerService } from './business-partner.service';

@Module({
  imports: [PrismaModule],
  providers: [BusinessPartnerService],
  exports: [BusinessPartnerService],
})
export class BusinessPartnerModule {}
