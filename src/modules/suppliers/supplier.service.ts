import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CommonService } from '../../common/services/common.service';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { AddressService } from '../addresses/address.service';
import { SupplierCategoryService } from '../supplier-categories/supplier-category.service';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { SupplierFilter } from './dto/filter-supplier.input';
import { SupplierConnection } from './entities/supplier-connection.entity';
import { SupplierEntity } from './entities/supplier.entity';
import { buildPayloadCreateSupplier } from './helpers/supplier-payload-builder';
import { buildSupplierWhereClause } from './helpers/supplier-where-builder';

const supplierInclude = Prisma.validator<Prisma.SupplierInclude>()({
  addresses: true,
});

type supplierWithRelations = Prisma.SupplierGetPayload<{
  include: typeof supplierInclude;
}>;

export type SupplierResponse = {
  entity: SupplierEntity;
  raw: supplierWithRelations;
};

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: SupplierCategoryService,
    private readonly commonService: CommonService,
    private readonly addressService: AddressService,
  ) {}

  // MÉTODO PRIVADO PARA MAPEAMENTO: Traduz o objeto do Prisma para a nossa Entidade GraphQL
  private mapToEntity(supplier: supplierWithRelations): SupplierEntity {
    return {
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      shortName: supplier.shortName,
      category: supplier.category,
      isActive: supplier.isActive === LocalMenus.NoYes.YES,
      supplierCurrency: supplier.currency,
      defaultAddressCode: supplier.addressByDefault,
      addresses: supplier.addresses?.map((addr) => this.addressService.mapAddressToEntity(addr)) || [],
    };
  }

  /**
   * Verifica de se o fornecedor existe
   * @param code - O código do fornecedor a ser verificado.
   * @returns `true` se o fornecedor existir, `false` caso contrário.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: { supplierCode: code },
    });

    return count > 0;
  }

  /**
   * Busca todos os fornecedores ativos e retorna uma lista de entidades SupplierEntity.
   * @returns Uma lista de SupplierEntity representando os fornecedores ativos.
   */
  async findAll(): Promise<SupplierEntity[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: 2 }, // Apenas fornecedores ativos
      include: {
        businessPartner: true,
        addresses: true,
      },
    });
    return suppliers.map(this.mapToEntity.bind(this));
  }

  async findPaginated(args: PaginationArgs, filter?: SupplierFilter): Promise<SupplierConnection> {
    const { first, after } = args;

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    const where = buildSupplierWhereClause(filter);

    const [suppliers, totalCount] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        include: { addresses: true },
        orderBy: [{ supplierCode: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.supplier.count({ where: where }),
    ]);

    const hasNextPage = suppliers.length > first;
    const nodes = hasNextPage ? suppliers.slice(0, -1) : suppliers;

    const edges = nodes.map((supplier) => ({
      cursor: Buffer.from(supplier.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(supplier as any),
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
        hasNextPage,
        hasPreviousPage: after ? true : false,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  async findOne(code: string): Promise<SupplierResponse> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { supplierCode: code },
      include: {
        businessPartner: true,
        addresses: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with code ${code} not found.`);
    }

    return { entity: this.mapToEntity(supplier as any), raw: supplier as any };
  }

  /**
   * Busca um fornecedor pelo seu código e retorna apenas os campos especificados.
   * @param code - O código do fornecedor a ser buscado.
   * @param select - Um objeto Prisma.SupplierSelect para definir os campos de retorno.
   * @returns Um objeto parcial do fornecedor contendo apenas os campos selecionados.
   * @throws NotFoundException se o fornecedor não for encontrado.
   */
  async findByCode<T extends Prisma.SupplierSelect>(
    code: string,
    select: T,
  ): Promise<Prisma.SupplierGetPayload<{ select: T }>> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { supplierCode: code },
      select: select,
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with code ${code} not found.`);
    }

    return supplier as Prisma.SupplierGetPayload<{ select: T }>;
  }

  async create(input: CreateSupplierInput): Promise<SupplierEntity> {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { supplierCode: input.supplierCode },
    });
    if (existingSupplier) {
      throw new ConflictException(`Supplier with code ${input.supplierCode} already exists.`);
    }

    const supplierCategory = await this.categoryService.findCategory(input.category);
    if (!supplierCategory) {
      throw new NotFoundException(`Supplier category ${input.category} not found.`);
    }

    try {
      const { businessPartner, supplier, address } = await buildPayloadCreateSupplier(
        input,
        supplierCategory,
        this.commonService,
      );

      const newSupplier = await this.prisma.$transaction(async (tx) => {
        await tx.businessPartner.upsert({
          where: { code: input.supplierCode },
          update: { isSupplier: 2 },
          create: businessPartner,
        });
        await tx.supplier.create({ data: supplier });
        await tx.address.create({ data: address });

        return supplier;
      });

      if (!newSupplier.supplierCode) {
        throw new InternalServerErrorException('Supplier code is missing after creation.');
      }

      const returnSupplier = await this.findOne(newSupplier.supplierCode);
      return returnSupplier.entity;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        // Ex: Violação de unique constraint
        if (error.code === 'P2002') {
          throw new ConflictException('A record with the provided data already exists.');
        }
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('Failed to create supplier:', error);
      throw new InternalServerErrorException('Could not create supplier.');
    }
  }

  // async update({ code, data }: UpdateSupplierInput): Promise<SupplierEntity> {
  //   // Aqui você implementaria a lógica de atualização.
  //   // Pode ser complexo, precisando atualizar BPSUPPLIER e BPARTNER.

  //   const updatedSupplier = await this.prisma.supplier.update({
  //     where: { supplierCode: code },
  //     data: {
  //       supplierName: data.name,
  //       shortName: data.shortName,
  //       // ... outros campos do supplier
  //     },
  //     include: { businessPartner: true, addresses: true },
  //   });

  //   // Atualizar também o BusinessPartner, se necessário
  //   if (data.name || data.europeanUnionVatNumber) {
  //     await this.prisma.businessPartner.update({
  //       where: { code: code },
  //       data: {
  //         partnerName1: data.name,
  //         europeanUnionVatNumber: data.europeanUnionVatNumber,
  //       },
  //     });
  //   }

  //   const returnSupplier = await this.findOne(code);
  //   return returnSupplier.entity;
  // }

  async remove(code: string): Promise<SupplierEntity> {
    const supplierReturn = await this.findOne(code);

    await this.prisma.$transaction([
      this.prisma.supplier.update({
        where: { supplierCode: code },
        data: { isActive: 1 }, // 1 = Inativo
      }),
      this.prisma.businessPartner.update({
        where: { code: code },
        data: { isActive: 1 }, // 1 = Inativo
      }),
    ]);

    const supplierToDeactivate = supplierReturn.entity;
    supplierToDeactivate.isActive = false;
    return supplierToDeactivate;
  }
}
