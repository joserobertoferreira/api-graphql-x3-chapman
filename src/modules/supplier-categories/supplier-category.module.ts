import { Module } from '@nestjs/common';
import { SupplierCategoryService } from './supplier-category.service';

@Module({
  providers: [SupplierCategoryService],
  exports: [SupplierCategoryService],
})
export class SupplierCategoryModule {}
