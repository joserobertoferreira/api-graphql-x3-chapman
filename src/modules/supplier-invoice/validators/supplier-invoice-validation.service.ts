import { Injectable } from '@nestjs/common';
import { RequestContextService } from 'src/common/context/request-context.service';
import { ParametersService } from 'src/common/parameters/parameter.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyService } from '../../companies/company.service';
import { DimensionTypeConfigService } from '../../dimension-types/dimension-type-config.service';
import { DimensionService } from '../../dimensions/dimension.service';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { UserService } from '../../users/user.service';
import { CreateSupplierInvoiceInput } from '../dto/create-supplier-invoice.input';

@Injectable()
export class SupplierInvoiceValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    private readonly companyService: CompanyService,
    private readonly dimensionService: DimensionService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
    private readonly userService: UserService,
    private readonly requestContextService: RequestContextService,
  ) {}

  /**
   * Validate if the entire CreateSupplierInvoiceInput object is valid.
   * @param input - The CreateSupplierInvoiceInput to be validated.
   * @param isExcel - Flag indicating if the input is coming from an Excel upload, which may have different validation rules.
   * @returns A valid context object
   * @throws HttpException if validation fails.
   */
  async validate(input: CreateSupplierInvoiceInput, isExcel: boolean): Promise<SupplierInvoiceContext> {
    // Normalize lines input
    const normalizedInput = this._normalizeSupplierInvoice(input);

    const { documentType, lines } = normalizedInput;
  }
}
