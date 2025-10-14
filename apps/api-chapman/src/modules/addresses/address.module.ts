import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddressService } from './address.service';

@Module({
  imports: [PrismaModule],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
