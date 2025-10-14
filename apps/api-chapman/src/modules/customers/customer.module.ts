import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CounterModule } from '../../common/counter/counter.module';
import { CommonModule } from '../../common/services/common.module';
import { DataloaderModule } from '../../dataloader/dataloader.module';
import { AddressModule } from '../addresses/address.module';
import { CustomerCategoryModule } from '../customer-categories/customer-category.module';
import { CustomerContextService } from './customer-context.service';
import { CustomerResolver } from './customer.resolver';
import { CustomerService } from './customer.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CounterModule),
    forwardRef(() => DataloaderModule),
    forwardRef(() => CustomerCategoryModule),
    forwardRef(() => CommonModule),
    forwardRef(() => AddressModule),
  ],
  providers: [CustomerResolver, CustomerService, CustomerContextService],
  exports: [CustomerService],
})
export class CustomerModule {}
