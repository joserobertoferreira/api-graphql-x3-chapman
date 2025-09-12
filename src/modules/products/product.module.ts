import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { ProductCategoryModule } from '../product-categories/product-category.module';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';

@Module({
  imports: [PrismaModule, ProductCategoryModule, forwardRef(() => CommonModule)],
  providers: [ProductService, ProductResolver],
  exports: [ProductService],
})
export class ProductModule {}
