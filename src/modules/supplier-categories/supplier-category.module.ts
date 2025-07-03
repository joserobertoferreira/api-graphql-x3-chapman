import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SupplierCategoryService } from './supplier-category.service';

@Module({
  imports: [PrismaModule],
  providers: [SupplierCategoryService],
  exports: [SupplierCategoryService],
})
export class SupplierCategoryModule {}
