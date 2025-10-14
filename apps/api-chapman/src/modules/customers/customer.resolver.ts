import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { AddressLoaderKey, IDataloaders } from '../../dataloader/dataloader.service';
import { AddressService } from '../addresses/address.service';
import { AddressEntity } from '../addresses/entities/address.entity';
import { CustomerService } from './customer.service';
import { CreateCustomerInput } from './dto/create-customer.input';
import { CustomerFilter } from './dto/filter-customer.input';
import { CustomerConnection } from './entities/customer-connection.entity';
import { CustomerEntity } from './entities/customer.entity';

@Resolver(() => CustomerEntity)
export class CustomerResolver {
  constructor(
    private readonly customerService: CustomerService,
    private readonly addressService: AddressService,
  ) {}

  @Query(() => CustomerConnection, { name: 'getCustomers' })
  async findPaginated(
    @Args() args: PaginationArgs,
    @Args('filter', { type: () => CustomerFilter, nullable: true }) filter?: CustomerFilter,
  ) {
    return await this.customerService.findPaginated(args, filter);
  }

  // @Query(() => CustomerEntity, { name: 'customer', nullable: true })
  // async findOne(@Args('customerCode', { type: () => ID }) customerCode: string): Promise<CustomerEntity | null> {
  //   try {
  //     const result = await this.customerService.findOne(customerCode);
  //     return result.entity;
  //   } catch (error) {
  //     console.error('Error fetching customer:', error);
  //     if (error instanceof NotFoundException) {
  //       return null;
  //     }
  //     throw error;
  //   }
  // }

  @Mutation(() => CustomerEntity, { name: 'createCustomer' })
  createCustomer(@Args('input') input: CreateCustomerInput): Promise<CustomerEntity> {
    return this.customerService.create(input);
  }

  // @Mutation(() => CustomerEntity)
  // updateCustomer(@Args('input') input: UpdateCustomerInput) {
  //   return this.customerService.update(input);
  // }

  // @Mutation(() => CustomerEntity)
  // removeCustomer(@Args('code', { type: () => ID }) code: string) {
  //   return this.customerService.remove(code);
  // }

  @ResolveField(() => String, { name: 'europeanUnionVatNumber', nullable: true })
  async getVatNumber(
    @Parent() customer: CustomerEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<string | ''> {
    if (!loaders) {
      throw new Error('Dataloader not initialized in context');
    }

    // Usamos o dataloader para buscar o BusinessPartner correspondente
    const businessPartner = await loaders.businessPartnerLoader.load(customer.customerCode);
    if (businessPartner instanceof Error) {
      console.error(`BusinessPartner not found for customer ${customer.customerCode}, but was expected.`);
      return ''; // ou null
    }

    return businessPartner?.europeanUnionVatNumber || '';
  }

  @ResolveField('addresses', () => [AddressEntity], { nullable: 'itemsAndList' })
  async getAddresses(
    @Parent() customer: CustomerEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<AddressEntity[]> {
    if (!loaders) {
      throw new Error('Dataloader not initialized in context');
    }

    const loaderKey: AddressLoaderKey = {
      entityType: 1,
      entityNumber: customer.customerCode,
    };

    // Usamos o dataloader para buscar os endereços correspondentes
    const addresses = await loaders.addressLoader.load(loaderKey);

    if (!addresses || addresses.length === 0) {
      return [];
    }

    const mappedAddresses = addresses.map((address) => this.addressService.mapAddressToEntity(address));

    return mappedAddresses;
  }
}
