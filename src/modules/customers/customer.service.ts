import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CommonService } from '../../common/services/common.service';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { AddressService } from '../addresses/address.service';
import { CustomerCategoryService } from '../customer-categories/customer-category.service';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomerFilter } from './dto/filter-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { CustomerConnection } from './entities/customer-connection.entity';
import { CustomerEntity } from './entities/customer.entity';
import { buildPayloadCreateCustomer } from './helpers/customer-payload-builder';
import { buildCustomerWhereClause } from './helpers/customer-where-builder';

const customerInclude = Prisma.validator<Prisma.CustomerInclude>()({
  addresses: true,
});

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerInclude;
}>;

export type CustomerResponse = {
  entity: CustomerEntity;
  raw: CustomerWithRelations;
};

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CustomerCategoryService,
    private readonly commonService: CommonService,
    private readonly addressService: AddressService,
  ) {}

  // MÉTODO PRIVADO PARA MAPEAMENTO: Traduz o objeto do Prisma para a nossa Entidade GraphQL
  private mapToEntity(customer: CustomerWithRelations): CustomerEntity {
    return {
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      shortName: customer.shortName,
      category: customer.category,
      isActive: customer.isActive === LocalMenus.NoYes.YES,
      customerCurrency: customer.customerCurrency,
      defaultAddressCode: customer.defaultAddress,
      addresses: customer.addresses?.map((addr) => this.addressService.mapAddressToEntity(addr)) || [],
    };
  }

  /**
   * Checks if the customer exists.
   * @param code - The customer code to check.
   * @returns `true` if the customer exists, `false` otherwise.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: { customerCode: code },
    });

    return count > 0;
  }

  /**
   * Retrieves all active customers and returns a list of CustomerEntity entities.
   * @returns A list of CustomerEntity representing the active customers.
   */
  async findAll(): Promise<CustomerEntity[]> {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: 2 }, // Apenas clientes ativos+
      include: {
        businessPartner: true,
        addresses: true,
      },
    });
    return customers.map(this.mapToEntity.bind(this));
  }

  async findPaginated(args: PaginationArgs, filter?: CustomerFilter): Promise<CustomerConnection> {
    const { first, after } = args;

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    const where = buildCustomerWhereClause(filter);

    const [customers, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        include: { addresses: true },
        orderBy: [{ customerCode: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.customer.count({ where: where }),
    ]);

    const hasNextPage = customers.length > first;
    const nodes = hasNextPage ? customers.slice(0, -1) : customers;

    const edges = nodes.map((customer) => ({
      cursor: Buffer.from(customer.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(customer as any),
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

  async findOne(code: string): Promise<CustomerResponse> {
    const customer = await this.prisma.customer.findUnique({
      where: { customerCode: code },
      include: {
        businessPartner: true,
        addresses: true, // Para um cliente, trazemos todos os endereços
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with code "${code}" not found.`);
    }

    return { entity: this.mapToEntity(customer as any), raw: customer as any };
  }

  /**
   * Busca um cliente pelo seu código e retorna apenas os campos especificados.
   * @param code - O código do cliente a ser buscado.
   * @param select - Um objeto Prisma.CustomerSelect para definir os campos de retorno.
   * @returns Um objeto parcial do cliente contendo apenas os campos selecionados.
   * @throws NotFoundException se o cliente não for encontrado.
   */
  async findByCode<T extends Prisma.CustomerSelect>(
    code: string,
    select: T,
  ): Promise<Prisma.CustomerGetPayload<{ select: T }>> {
    const customer = await this.prisma.customer.findUnique({
      where: { customerCode: code },
      select: select,
    });

    if (!customer) {
      throw new NotFoundException(`Customer with code "${code}" not found.`);
    }

    return customer as Prisma.CustomerGetPayload<{ select: T }>;
  }

  async create(input: CreateCustomerInput): Promise<CustomerEntity> {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { customerCode: input.customerCode },
    });
    if (existingCustomer) {
      throw new ConflictException(`Customer with code "${input.customerCode}" already exists.`);
    }

    const customerCategory = await this.categoryService.findCategory(input.category);
    if (!customerCategory) {
      throw new NotFoundException(`Customer category "${input.category}" not found.`);
    }

    try {
      const { businessPartner, customer, address, shipToAddress } = await buildPayloadCreateCustomer(
        input,
        customerCategory,
        this.commonService,
      );

      const newCustomer = await this.prisma.$transaction(async (tx) => {
        await tx.businessPartner.upsert({
          where: { code: input.customerCode },
          update: { isCustomer: 2 },
          create: businessPartner,
        });
        await tx.customer.create({ data: customer });
        await tx.address.create({ data: address });
        await tx.shipToCustomer.create({ data: shipToAddress });

        return customer;
      });

      if (!newCustomer.customerCode) {
        throw new InternalServerErrorException('Customer code is missing after creation.');
      }

      const returnCustomer = await this.findOne(newCustomer.customerCode);
      return returnCustomer.entity;
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

      console.error('Failed to create customer:', error);
      throw new InternalServerErrorException('Could not create customer.');
    }
  }

  async update({ code, data }: UpdateCustomerInput): Promise<CustomerEntity> {
    // Aqui você implementaria a lógica de atualização.
    // Pode ser complexo, precisando atualizar BPCUSTOMER e BPARTNER.
    // Exemplo simples:
    const updatedCustomer = await this.prisma.customer.update({
      where: { customerCode: code },
      data: {
        customerName: data.name,
        shortName: data.shortName,
        // ... outros campos do customer
      },
      include: { businessPartner: true, addresses: true },
    });

    // Atualizar também o BusinessPartner, se necessário
    if (data.name || data.europeanUnionVatNumber) {
      await this.prisma.businessPartner.update({
        where: { code: code },
        data: {
          partnerName1: data.name,
          europeanUnionVatNumber: data.europeanUnionVatNumber,
        },
      });
    }

    const returnCustomer = await this.findOne(code);
    return returnCustomer.entity;
  }

  async remove(code: string): Promise<CustomerEntity> {
    const customerReturn = await this.findOne(code);

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { customerCode: code },
        data: { isActive: 1 }, // 1 = Inativo
      }),
      this.prisma.businessPartner.update({
        where: { code: code },
        data: { isActive: 1 }, // 1 = Inativo
      }),
    ]);

    const customerToDeactivate = customerReturn.entity;
    customerToDeactivate.isActive = false;
    return customerToDeactivate;
  }
}
