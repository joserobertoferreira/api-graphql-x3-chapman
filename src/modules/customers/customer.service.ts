import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { generateUUIDBuffer, getAuditTimestamps } from '../../common/utils/audit-date.utils';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomerFilter } from './dto/filter-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { AddressEntity } from './entities/address.entity';
import { CustomerConnection } from './entities/customer-connection.entity';
import { CustomerEntity } from './entities/customer.entity';
import { buildCustomerWhereClause } from './helpers/customer-where-builder';

const customerInclude = Prisma.validator<Prisma.CustomerInclude>()({
  addresses: true,
});

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerInclude;
}>;

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  // MÉTODO PRIVADO PARA MAPEAMENTO: Traduz o objeto do Prisma para a nossa Entidade GraphQL
  private mapToEntity(customer: CustomerWithRelations): CustomerEntity {
    return {
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      shortName: customer.shortName,
      category: customer.category,
      isActive: customer.isActive,
      defaultAddressCode: customer.defaultAddress,
      addresses: customer.addresses?.map((addr) => this.mapAddressToEntity(addr)) || [],
    };
  }

  private mapAddressToEntity(address: Address): AddressEntity {
    return {
      entityType: address.entityType,
      entityNumber: address.entityNumber,
      code: address.code,
      description: address.description,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      addressLine3: address.addressLine3,
      zipCode: address.zipCode,
      city: address.city,
      state: address.state,
      country: address.country,
      countryName: address.countryName,
      isDefault: address.isDefault,
    };
  }

  async create(input: CreateCustomerInput): Promise<CustomerEntity> {
    const { customerCode, name, shortName, category, europeanUnionVatNumber, language, defaultAddress } = input;

    const existingCustomer = await this.prisma.customer.findUnique({
      where: { customerCode: customerCode },
    });
    if (existingCustomer) {
      throw new ConflictException(`Customer with code "${customerCode}" already exists.`);
    }

    try {
      const newCustomer = await this.prisma.$transaction(async (tx) => {
        const BpTimestamps = getAuditTimestamps();
        const BpUUID = generateUUIDBuffer();

        await tx.businessPartner.create({
          data: {
            code: customerCode,
            partnerName1: name,
            shortCompanyName: shortName,
            europeanUnionVatNumber: europeanUnionVatNumber,
            isCustomer: 2,
            country: defaultAddress.country,
            language: language,
            defaultAddress: defaultAddress.code,
            isActive: 2, // 2 = Ativo
            createDate: BpTimestamps.date,
            updateDate: BpTimestamps.date,
            createDatetime: BpTimestamps.dateTime,
            updateDatetime: BpTimestamps.dateTime,
            singleID: BpUUID,
          },
        });

        const customerTimestamps = getAuditTimestamps();
        const customerUUID = generateUUIDBuffer();

        const customer = await tx.customer.create({
          data: {
            customerCode: customerCode,
            customerName: name,
            shortName: shortName,
            category: category,
            defaultAddress: defaultAddress.code,
            defaultShipToAddress: defaultAddress.code,
            isActive: 2, // 2 = Ativo
            createDate: customerTimestamps.date,
            updateDate: customerTimestamps.date,
            createDatetime: customerTimestamps.dateTime,
            updateDatetime: customerTimestamps.dateTime,
            singleID: customerUUID,
          },
        });

        const addressTimestamps = getAuditTimestamps();
        const addressUUID = generateUUIDBuffer();

        await tx.address.create({
          data: {
            entityType: 1,
            entityNumber: customerCode,
            code: defaultAddress.code,
            description: defaultAddress.description,
            addressLine1: defaultAddress.addressLine1,
            addressLine2: defaultAddress.addressLine2,
            zipCode: defaultAddress.zipCode,
            city: defaultAddress.city,
            state: defaultAddress.state,
            country: defaultAddress.country,
            isDefault: 2,
            createDate: addressTimestamps.date,
            updateDate: addressTimestamps.date,
            createDatetime: addressTimestamps.dateTime,
            updateDatetime: addressTimestamps.dateTime,
            singleID: addressUUID,
          },
        });

        return customer;
      });

      return this.findOne(newCustomer.customerCode);
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

  async findAll(): Promise<CustomerEntity[]> {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: 2 }, // Apenas clientes ativos
      include: {
        businessPartner: true,
        addresses: true,
      },
    });
    return customers.map(this.mapToEntity.bind(this));
  }

  async findPaginated(args: PaginationArgs, filter?: CustomerFilter): Promise<CustomerConnection> {
    const { first, after } = args;

    const cursor = after ? { id: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    console.log('--- [CustomerService] Received filter:', JSON.stringify(filter, null, 2));

    const where = buildCustomerWhereClause(filter);

    console.log('--- [CustomerService] Constructed WHERE clause:', JSON.stringify(where, null, 2));

    const [customers, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        include: { addresses: true },
        orderBy: { customerCode: 'asc' },
      }),
      this.prisma.customer.count({ where: where }),
    ]);

    const hasNextPage = customers.length > first;
    const nodes = hasNextPage ? customers.slice(0, -1) : customers;

    const edges = nodes.map((customer) => ({
      cursor: Buffer.from(customer.id.toString()).toString('base64'),
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

  async findOne(code: string): Promise<CustomerEntity> {
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

    return this.mapToEntity(customer);
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

    return this.findOne(code);
  }

  // É mais seguro desativar do que deletar em sistemas legados.
  async remove(code: string): Promise<CustomerEntity> {
    const customerToDeactivate = await this.findOne(code);

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

    customerToDeactivate.isActive = 1;
    return customerToDeactivate;
  }
}
