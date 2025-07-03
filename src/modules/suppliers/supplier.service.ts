import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CommonService } from '../../common/services/common.service';
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
      isActive: supplier.isActive,
      defaultAddressCode: supplier.addressByDefault,
      addresses: supplier.addresses?.map((addr) => this.addressService.mapAddressToEntity(addr)) || [],
    };
  }

  async findAll(): Promise<SupplierEntity[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: 2 }, // Apenas clientes ativos+
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
        orderBy: { supplierCode: 'asc' },
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

  async findOne(code: string): Promise<SupplierEntity> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { supplierCode: code },
      include: {
        businessPartner: true,
        addresses: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with code "${code}" not found.`);
    }

    return this.mapToEntity(supplier as any);
  }

  async create(input: CreateSupplierInput): Promise<SupplierEntity> {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { supplierCode: input.supplierCode },
    });
    if (existingSupplier) {
      throw new ConflictException(`supplier with code "${input.supplierCode}" already exists.`);
    }

    const supplierCategory = await this.categoryService.findCategory(input.category);
    if (!supplierCategory) {
      throw new NotFoundException(`Supplier category "${input.category}" not found.`);
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
      return this.findOne(newSupplier.supplierCode);
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

  // async update({ code, data }: UpdateSupplierInput): Promise<supplierEntity> {
  //   // Aqui você implementaria a lógica de atualização.
  //   // Pode ser complexo, precisando atualizar BPsupplier e BPARTNER.
  //   // Exemplo simples:
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

  //   return this.findOne(code);
  // }

  async remove(code: string): Promise<SupplierEntity> {
    const supplierToDeactivate = await this.findOne(code);

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

    supplierToDeactivate.isActive = 1;
    return supplierToDeactivate;
  }
}
