import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerCategory } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CustomerCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findCategory(code: string): Promise<CustomerCategory> {
    const category = await this.prisma.customerCategory.findUnique({
      where: { category: code },
    });

    if (!category) {
      throw new NotFoundException(`Customer category with code "${code}" not found.`);
    }
    return category;
  }
}
