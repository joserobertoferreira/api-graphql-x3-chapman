import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AddressModule } from '../addresses/address.module';
import { SiteResolver } from './site.resolver';
import { SiteService } from './site.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AddressModule)],
  providers: [SiteService, SiteResolver],
  exports: [SiteService],
})
export class SiteModule {}
