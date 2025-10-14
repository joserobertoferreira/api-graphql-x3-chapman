import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { CounterService } from '../../common/counter/counter.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CommonService } from '../../common/services/common.service';
import {
  SupplierResponse,
  SupplierSequenceNumber,
  SupplierWithRelations,
} from '../../common/types/business-partner.types';
import { PrismaTransactionClient } from '../../common/types/common.types';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { AddressService } from '../addresses/address.service';
import { SupplierCategoryService } from '../supplier-categories/supplier-category.service';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { SupplierFilter } from './dto/filter-supplier.input';
import { SupplierConnection } from './entities/supplier-connection.entity';
import { SupplierEntity } from './entities/supplier.entity';
import { buildPayloadCreateSupplier } from './helpers/supplier-payload-builder';
import { buildSupplierWhereClause } from './helpers/supplier-where-builder';
import { SupplierContextService } from './supplier-context.service';

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceNumberService: CounterService,
    private readonly commonService: CommonService,
    private readonly addressService: AddressService,
    private readonly categoryService: SupplierCategoryService,
    private readonly contextService: SupplierContextService,
  ) {}

  private mapToEntity(supplier: SupplierWithRelations): SupplierEntity {
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
   * Checks if the supplier exists.
   * @param code - The supplier code to check.
   * @returns `true` if the supplier exists, `false` otherwise.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: { supplierCode: code },
    });

    return count > 0;
  }

  /**
   * Retrieves all active suppliers and returns a list of SupplierEntity entities.
   * @returns A list of SupplierEntity representing the active suppliers.
   */
  async findAll(): Promise<SupplierEntity[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: LocalMenus.NoYes.YES },
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
   * Finds a customer by its code and returns only the specified fields.
   * @param code - The customer code to search for.
   * @param select - A Prisma.CustomerSelect object to define the returned fields.
   * @returns A partial customer object containing only the selected fields.
   * @throws NotFoundException if the customer is not found.
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

  /**
   * Creates a new supplier.
   * @param input the context to create a new supplier
   * @returns the created supplier entity
   */
  async create(input: CreateSupplierInput): Promise<SupplierEntity> {
    // Execute the context building outside the transaction
    const { context, updatedInput } = await this.contextService.buildHeaderContext(input);

    try {
      const { businessPartner, supplier, address } = await buildPayloadCreateSupplier(
        updatedInput,
        context.category,
        this.commonService,
      );

      const newSupplier = await this.prisma.$transaction(async (tx) => {
        // Check if supplier code will be created automatically.
        if (context.category.supplierSequence.trim() !== '') {
          // Get the next unique number for the supplier
          const newSupplierNumber = await this.getNextSupplierNumber(tx, {
            sequence: context.category.supplierSequence,
            company: '',
            site: '',
            legislation: '',
            date: new Date(),
            complement: '',
          });
          supplier.supplierCode = newSupplierNumber;
          supplier.billBySupplier = newSupplierNumber;
          supplier.payToBusinessPartner = newSupplierNumber;
          supplier.groupSupplier = newSupplierNumber;
          supplier.riskSupplier = newSupplierNumber;
          businessPartner.code = newSupplierNumber;
          address.entityNumber = newSupplierNumber;
        }

        await tx.businessPartner.upsert({
          where: { code: supplier.supplierCode },
          update: { isSupplier: LocalMenus.NoYes.YES },
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

  /**
   * Gets the next available supplier number.
   */
  async getNextSupplierNumber(tx: PrismaTransactionClient, args: SupplierSequenceNumber): Promise<string> {
    const { sequence, site, date, complement, company } = args;

    // Get the next counter value for the supplier
    const nextCounterValue = await this.sequenceNumberService.getNextCounterTransaction(
      tx,
      sequence,
      company,
      site,
      date,
      complement,
    );

    return nextCounterValue;
  }
}
