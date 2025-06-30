import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DataloaderModule } from '../../dataloader/dataloader.module';
import { CustomerResolver } from './customer.resolver';
import { CustomerService } from './customer.service';

@Module({
  imports: [PrismaModule, DataloaderModule],
  providers: [CustomerResolver, CustomerService],
})
export class CustomerModule {}
