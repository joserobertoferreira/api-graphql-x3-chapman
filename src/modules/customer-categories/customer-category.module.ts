import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CustomerCategoryService } from './customer-category.service';

@Module({
  imports: [PrismaModule],
  providers: [CustomerCategoryService],
  exports: [CustomerCategoryService],
})
export class CustomerCategoryModule {}
