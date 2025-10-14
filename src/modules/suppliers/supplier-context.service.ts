import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ReturnSupplierBuildContext, ValidatedSupplierContext } from '../../common/types/business-partner.types';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierCategoryService } from '../supplier-categories/supplier-category.service';
import { CreateSupplierInput } from './dto/create-supplier.input';

@Injectable()
export class SupplierContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: SupplierCategoryService,
  ) {}

  /**
   * Fetches and validates header data for creating a supplier.
   * @param input - The API DTO.
   * @returns A context object with validated data.
   */
  async buildHeaderContext(input: CreateSupplierInput): Promise<ReturnSupplierBuildContext> {
    // Normalize specific fields to uppercase
    const updatedContext = input;

    const headerFields = ['category', 'supplierCode', 'europeanUnionVatNumber', 'language'];
    const addressFields = ['code', 'description', 'zipCode', 'state', 'country'];

    for (const field of headerFields) {
      if (updatedContext[field]) {
        updatedContext[field] = updatedContext[field].toUpperCase();
      }
    }

    if (updatedContext.defaultAddress) {
      const addressObj = updatedContext.defaultAddress;

      for (const field of addressFields) {
        if (addressObj[field] && typeof addressObj[field] === 'string') {
          addressObj[field] = addressObj[field].toUpperCase();
        }
      }
    }

    // Validate supplier category existence
    const supplierCategory = await this.categoryService.findCategory(updatedContext.category);
    if (!supplierCategory) {
      throw new NotFoundException(`Supplier category ${updatedContext.category} not found.`);
    }

    // Check supplier creation method
    if (supplierCategory.supplierSequence.trim() === '') {
      const existingSupplier = await this.prisma.supplier.findUnique({
        where: { supplierCode: updatedContext.supplierCode },
      });
      if (existingSupplier) {
        throw new ConflictException(`Supplier with code ${updatedContext.supplierCode} already exists.`);
      }
    }

    const context: ValidatedSupplierContext = {
      category: supplierCategory,
    };

    return { context, updatedInput: updatedContext };
  }
}
