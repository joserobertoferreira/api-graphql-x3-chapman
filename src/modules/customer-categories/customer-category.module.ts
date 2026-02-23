import { Module } from '@nestjs/common';
import { CustomerCategoryService } from './customer-category.service';

@Module({
  providers: [CustomerCategoryService],
  exports: [CustomerCategoryService],
})
export class CustomerCategoryModule {}
