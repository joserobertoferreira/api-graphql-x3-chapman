import { Injectable, NotFoundException } from '@nestjs/common';
import { SupplierCategory } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupplierCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findCategory(code: string): Promise<SupplierCategory> {
    const category = await this.prisma.supplierCategory.findUnique({
      where: { category: code },
    });

    if (!category) {
      throw new NotFoundException(`Supplier category with code "${code}" not found.`);
    }
    return category;
  }
}
