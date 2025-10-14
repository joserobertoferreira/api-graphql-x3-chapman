import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CounterModule } from '../../common/counter/counter.module';
import { CommonModule } from '../../common/services/common.module';
import { DataloaderModule } from '../../dataloader/dataloader.module';
import { AddressModule } from '../addresses/address.module';
import { SupplierCategoryModule } from '../supplier-categories/supplier-category.module';
import { SupplierContextService } from './supplier-context.service';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CounterModule),
    forwardRef(() => DataloaderModule),
    forwardRef(() => SupplierCategoryModule),
    forwardRef(() => CommonModule),
    forwardRef(() => AddressModule),
  ],
  providers: [SupplierResolver, SupplierService, SupplierContextService],
  exports: [SupplierService],
})
export class SupplierModule {}
