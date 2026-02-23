import { forwardRef, Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ProductCategoryModule } from '../product-categories/product-category.module';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';

@Module({
  imports: [ProductCategoryModule, forwardRef(() => CommonModule)],
  providers: [ProductService, ProductResolver],
  exports: [ProductService],
})
export class ProductModule {}
