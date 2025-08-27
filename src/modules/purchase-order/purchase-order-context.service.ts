import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { CommonService } from '../../common/services/common.service';
import { DEFAULT_LEGACY_DATE, Ledgers } from '../../common/types/common.types';
import { isDateInRange } from '../../common/utils/date.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyService } from '../companies/company.service';
import { SupplierService } from '../suppliers/supplier.service';
import { CreatePurchaseOrderInput, CreatePurchaseOrderLineInput } from './dto/create-purchase-order.input';

export interface ValidatedPurchaseOrderContext {
  supplier: Prisma.SupplierGetPayload<{ include: { addresses: true; businessPartner: true } }>;
  site: Prisma.SiteGetPayload<{ include: { company: true } }>;
  ledgers: Ledgers[];
}

@Injectable()
export class PurchaseOrderContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierService: SupplierService,
    private readonly companyService: CompanyService,
    private readonly commonService: CommonService,
  ) {}

  /**
   * Busca e valida os dados de cabeçalho para a criação de uma encomenda.
   * @param input - O DTO da API.
   * @returns Um objeto de contexto com os dados validados.
   */
  async buildHeaderContext(input: CreatePurchaseOrderInput): Promise<ValidatedPurchaseOrderContext> {
    const supplierReturn = await this.supplierService.findOne(input.supplier);

    const supplier = supplierReturn.raw as Prisma.SupplierGetPayload<{
      include: { addresses: true; businessPartner: true };
    }>;

    const site = await this.companyService.getSiteByCode(input.purchaseSite, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Purchase site "${input.purchaseSite}" or its associated company not found.`);
    }

    const ledgers = await this.commonService.getLedgers(site.company.ACM_0);
    if (!ledgers || ledgers.length === 0) {
      throw new NotFoundException(`No ledgers found for company associated with site "${input.purchaseSite}".`);
    }

    // Valida as dimensões informadas no payload da encomenda
    await this.validateDimensions(input.lines, site.company, 'APP', input.orderDate);

    // Valida os produtos informados nas linhas da encomenda
    await this.validateProducts(input.lines);

    return {
      supplier,
      site,
      ledgers,
    };
  }

  /**
   * Valida os produtos informados nas linhas da encomenda.
   */
  private async validateProducts(lines: CreatePurchaseOrderLineInput[]): Promise<void> {
    if (!lines || lines.length === 0) return;

    const productsToValidate = [...new Set(lines.map((line) => line.product))];

    const existingProducts = await this.prisma.products.findMany({
      where: {
        code: { in: productsToValidate },
      },
      select: {
        code: true,
      },
    });

    // Verifica se a quantidade de produtos encontrados corresponde à quantidade de produtos únicos a validar.
    if (existingProducts.length !== productsToValidate.length) {
      // Se não corresponder, significa que um ou mais produtos não foram encontrados.
      // Agora, podemos fazer uma lógica para descobrir exatamente quais estão faltando.
      const foundProductCodes = new Set(existingProducts.map((p) => p.code));
      const missingProducts = productsToValidate.filter((code) => !foundProductCodes.has(code));

      throw new NotFoundException(`The following products do not exist: ${missingProducts.join(', ')}.`);
    }
  }

  private async validateDimensions(
    lines: CreatePurchaseOrderLineInput[],
    company: Company,
    orderTransaction: string,
    orderDate: Date = new Date(),
  ): Promise<void> {
    if (!lines || lines.length === 0) return;

    // Busca as dimensões obrigatórias da sociedade
    const mandatoryDimensions = new Map<string, number>();
    for (let i = 1; i <= 20; i++) {
      if (company[`isMandatoryDimension${i}`] === 2) {
        const typeCode = company[`dimensionType${i}`];
        if (typeCode) {
          mandatoryDimensions.set(typeCode as string, i);
        }
      }
    }

    // Busca as dimensões para a transação de encomenda
    const transactionDimensions = await this.commonService.getAnalyticalTransactionData({
      tableAbbreviation: 'PTR',
      transaction: orderTransaction,
    });
    if (!transactionDimensions || transactionDimensions.length === 0) {
      const allProvidedDimensions = lines.flatMap((line) => line.dimensions ?? []);
      if (allProvidedDimensions.length > 0) {
        throw new BadRequestException(
          `No dimensions are applicable for order transaction "${orderTransaction}", but some were provided.`,
        );
      }
    }

    const allowedDimensions = new Set(transactionDimensions?.map((td) => td.dimensionType) ?? []);

    const dimensionsToValidate: { dimensionType: string; dimension: string }[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Cria um mapa das dimensões fornecidas na linha
      const providedDimensions = new Map(line.dimensions?.map((d) => [d.typeCode, d.value]) ?? []);

      // Verifica se as dimensões obrigatórias estão presentes
      const missingMandatory: string[] = [];

      for (const [mandatoryType] of mandatoryDimensions.entries()) {
        // A dimensão é obrigatória e permitida para a transação
        if (allowedDimensions.has(mandatoryType)) {
          // Foi informada na linha?
          if (!providedDimensions.has(mandatoryType)) {
            missingMandatory.push(mandatoryType);
          }
        }
      }

      if (missingMandatory.length > 0) {
        throw new BadRequestException(
          `Line ${lineNumber}: Missing required dimensions: ${missingMandatory.join(', ')}.`,
        );
      }

      // Verifica se as dimensões informadas são válidas
      const invalidDimensions: string[] = [];

      for (const [providedType] of providedDimensions.entries()) {
        // A dimensão informada não é permitida para a transação
        if (!allowedDimensions.has(providedType)) {
          invalidDimensions.push(providedType);
        }
      }

      if (invalidDimensions.length > 0) {
        throw new BadRequestException(
          `Line ${lineNumber}: Invalid dimensions provided for this transaction: ${invalidDimensions.join(', ')}.`,
        );
      }

      // Adiciona as dimensões válidas para o payload
      if (line.dimensions) {
        for (const dim of line.dimensions) {
          dimensionsToValidate.push({
            dimensionType: dim.typeCode,
            dimension: dim.value,
          });
        }
      }
    });

    // Validação final das dimensões
    if (dimensionsToValidate.length > 0) {
      // Remover duplicates
      const uniqueDimensions = [
        ...new Map(dimensionsToValidate.map((item) => [`${item.dimensionType}:${item.dimension}`, item])).values(),
      ];

      // Verifica se os valores das dimensões existem
      await this.validateDimensionValuesExist(uniqueDimensions);

      // Verifica se a dimensão fixture é valida
      const fixtureDimension = uniqueDimensions.find((d) => d.dimensionType === 'FIX');
      if (!fixtureDimension) {
        throw new BadRequestException('Missing required fixture dimension.');
      }

      // Recupera as datas de inicio e fim de validade para a dimensão fixture
      const fixtureData = await this.prisma.dimensions.findUnique({
        where: { dimensionType_dimension: { dimensionType: 'FIX', dimension: fixtureDimension.dimension } },
      });
      const fixtureValidFrom = fixtureData?.validityStartDate || DEFAULT_LEGACY_DATE;
      const fixtureValidTo = fixtureData?.validityEndDate || DEFAULT_LEGACY_DATE;

      console.log(fixtureValidFrom, fixtureValidTo, orderDate);

      if (!isDateInRange(orderDate, fixtureValidFrom, fixtureValidTo)) {
        throw new BadRequestException('Outside fixture validity date limit.');
      }
    }
  }

  private async validateDimensionValuesExist(pairs: { dimensionType: string; dimension: string }[]): Promise<void> {
    const existingValues = await this.prisma.dimensions.findMany({
      where: { OR: pairs },
      select: { dimensionType: true, dimension: true },
    });

    const foundValues = new Set(existingValues.map((v) => `${v.dimensionType}:${v.dimension}`));
    const nonExistentValues = pairs.filter((p) => !foundValues.has(`${p.dimensionType}:${p.dimension}`));

    if (nonExistentValues.length > 0) {
      const errorMsg = nonExistentValues.map((p) => `value '${p.dimension}' for type '${p.dimensionType}'`).join('; ');
      throw new BadRequestException(`The following dimension values do not exist: ${errorMsg}.`);
    }
  }
}
