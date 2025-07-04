import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductCategory } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findCategory(stockSite: string, code: string): Promise<ProductCategory> {
    const category = await this.prisma.productCategory.findUnique({
      where: { stockSite_code: { stockSite, code } },
    });

    if (!category) {
      throw new NotFoundException(`Category with code "${code}" not found.`);
    }
    return category;
  }
}
