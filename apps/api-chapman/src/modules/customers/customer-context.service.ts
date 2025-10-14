import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ReturnCustomerBuildContext, ValidatedCustomerContext } from '../../common/types/business-partner.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerCategoryService } from '../customer-categories/customer-category.service';
import { CreateCustomerInput } from './dto/create-customer.input';

@Injectable()
export class CustomerContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CustomerCategoryService,
  ) {}

  /**
   * Fetches and validates header data for creating a customer.
   * @param input - The API DTO.
   * @returns A context object with validated data.
   */
  async buildHeaderContext(input: CreateCustomerInput): Promise<ReturnCustomerBuildContext> {
    // Normalize specific fields to uppercase
    const updatedContext = input;

    const headerFields = ['category', 'customerCode', 'europeanUnionVatNumber', 'language'];
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

    // Validate customer category existence
    const customerCategory = await this.categoryService.findCategory(updatedContext.category);
    if (!customerCategory) {
      throw new NotFoundException(`Customer category ${updatedContext.category} not found.`);
    }

    // Check customer creation method
    if (customerCategory.customerSequence.trim() === '') {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { customerCode: updatedContext.customerCode },
      });
      if (existingCustomer) {
        throw new ConflictException(`Customer with code ${updatedContext.customerCode} already exists.`);
      }
    }

    const context: ValidatedCustomerContext = {
      category: customerCategory,
    };

    return { context, updatedInput: updatedContext };
  }
}
