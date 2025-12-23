import { forwardRef, Module } from '@nestjs/common';
import { CounterModule } from 'src/common/counter/counter.module';
import { DataloaderModule } from 'src/dataloader/dataloader.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddressModule } from '../addresses/address.module';
import { CommonModule } from '../common/common.module';
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
