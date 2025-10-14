import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { CounterService } from '../../common/counter/counter.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CommonService } from '../../common/services/common.service';
import {
  CustomerResponse,
  CustomerSequenceNumber,
  CustomerWithRelations,
} from '../../common/types/business-partner.types';
import { PrismaTransactionClient } from '../../common/types/common.types';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { AddressService } from '../addresses/address.service';
import { CustomerContextService } from './customer-context.service';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomerFilter } from './dto/filter-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { CustomerConnection } from './entities/customer-connection.entity';
import { CustomerEntity } from './entities/customer.entity';
import { buildPayloadCreateCustomer } from './helpers/customer-payload-builder';
import { buildCustomerWhereClause } from './helpers/customer-where-builder';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceNumberService: CounterService,
    private readonly commonService: CommonService,
    private readonly addressService: AddressService,
    private readonly contextService: CustomerContextService,
  ) {}

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
      where: { isActive: LocalMenus.NoYes.YES },
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
        addresses: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with code ${code} not found.`);
    }

    return { entity: this.mapToEntity(customer as any), raw: customer as any };
  }

  /**
   * Finds a customer by its code and returns only the specified fields.
   * @param code - The customer code to search for.
   * @param select - A Prisma.CustomerSelect object to define the returned fields.
   * @returns A partial customer object containing only the selected fields.
   * @throws NotFoundException if the customer is not found.
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
      throw new NotFoundException(`Customer with code ${code} not found.`);
    }

    return customer as Prisma.CustomerGetPayload<{ select: T }>;
  }

  /**
   * Creates a new customer.
   * @param input the context to create a new customer
   * @returns the created customer entity
   */
  async create(input: CreateCustomerInput): Promise<CustomerEntity> {
    // Execute the context building outside the transaction
    const { context, updatedInput } = await this.contextService.buildHeaderContext(input);

    try {
      const { businessPartner, customer, address, shipToAddress } = await buildPayloadCreateCustomer(
        updatedInput,
        context.category,
        this.commonService,
      );

      const newCustomer = await this.prisma.$transaction(async (tx) => {
        // Check if customer code will be created automatically.
        if (context.category.customerSequence.trim() !== '') {
          // Get the next unique number for the customer
          const newCustomerNumber = await this.getNextCustomerNumber(tx, {
            sequence: context.category.customerSequence,
            company: '',
            site: '',
            legislation: '',
            date: new Date(),
            complement: '',
          });
          customer.customerCode = newCustomerNumber;
          customer.billToCustomer = newCustomerNumber;
          customer.payByCustomer = newCustomerNumber;
          customer.groupCustomer = newCustomerNumber;
          customer.riskCustomer = newCustomerNumber;
          businessPartner.code = newCustomerNumber;
          address.entityNumber = newCustomerNumber;
          shipToAddress.customer = newCustomerNumber;
        }

        await tx.businessPartner.upsert({
          where: { code: customer.customerCode },
          update: { isCustomer: LocalMenus.NoYes.YES },
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

  /**
   * Gets the next available customer number.
   */
  async getNextCustomerNumber(tx: PrismaTransactionClient, args: CustomerSequenceNumber): Promise<string> {
    const { sequence, site, date, complement, company } = args;

    // Get the next counter value for the customer
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
