import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { DataloaderModule } from '../../dataloader/dataloader.module';
import { AddressModule } from '../addresses/address.module';
import { CustomerCategoryModule } from '../customer-categories/customer-category.module';
import { CustomerResolver } from './customer.resolver';
import { CustomerService } from './customer.service';

@Module({
  imports: [
    PrismaModule,
    DataloaderModule,
    CustomerCategoryModule,
    forwardRef(() => CommonModule),
    forwardRef(() => AddressModule),
  ],
  providers: [CustomerResolver, CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
