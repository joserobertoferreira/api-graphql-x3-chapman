import { Module } from '@nestjs/common';
import { ProductCategoryService } from './product-category.service';

@Module({
  providers: [ProductCategoryService],
  exports: [ProductCategoryService],
})
export class ProductCategoryModule {}
