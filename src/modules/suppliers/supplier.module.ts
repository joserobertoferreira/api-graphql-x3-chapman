import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { DataloaderModule } from '../../dataloader/dataloader.module';
import { AddressModule } from '../addresses/address.module';
import { SupplierCategoryModule } from '../supplier-categories/supplier-category.module';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

@Module({
  imports: [
    PrismaModule,
    DataloaderModule,
    SupplierCategoryModule,
    forwardRef(() => CommonModule),
    forwardRef(() => AddressModule),
  ],
  providers: [SupplierResolver, SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
