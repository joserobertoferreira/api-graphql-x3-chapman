import { Args, Context, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { AddressLoaderKey, IDataloaders } from '../../dataloader/dataloader.service';
import { AddressService } from '../addresses/address.service';
import { AddressEntity } from '../addresses/entities/address.entity';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { SupplierFilter } from './dto/filter-supplier.input';
import { SupplierConnection } from './entities/supplier-connection.entity';
import { SupplierEntity } from './entities/supplier.entity';
import { SupplierService } from './supplier.service';

@Resolver(() => SupplierEntity)
export class SupplierResolver {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly addressService: AddressService,
  ) {}

  @Query(() => SupplierConnection, { name: 'suppliers' })
  async findPaginated(
    @Args() args: PaginationArgs,
    @Args('filter', { type: () => SupplierFilter, nullable: true }) filter?: SupplierFilter,
  ) {
    return this.supplierService.findPaginated(args, filter);
  }

  @Query(() => SupplierEntity, { name: 'supplier' })
  findOne(@Args('supplierCode', { type: () => ID }) supplierCode: string) {
    return this.supplierService.findOne(supplierCode);
  }

  @Mutation(() => SupplierEntity, { name: 'createSupplier' })
  createSupplier(@Args('input') input: CreateSupplierInput): Promise<SupplierEntity> {
    return this.supplierService.create(input);
  }

  // @Mutation(() => SupplierEntity)
  // updateSupplier(@Args('input') input: UpdateSupplierInput) {
  //   return this.supplierService.update(input);
  // }

  // @Mutation(() => SupplierEntity)
  // removeSupplier(@Args('code', { type: () => ID }) code: string) {
  //   return this.supplierService.remove(code);
  // }

  @ResolveField(() => String, { name: 'europeanUnionVatNumber', nullable: true })
  async getVatNumber(
    @Parent() supplier: SupplierEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<string | ''> {
    if (!loaders) {
      throw new Error('Dataloader not initialized in context');
    }

    // Usamos o dataloader para buscar o BusinessPartner correspondente
    const businessPartner = await loaders.businessPartnerLoader.load(supplier.supplierCode);
    return businessPartner?.europeanUnionVatNumber || '';
  }

  @ResolveField('addresses', () => [AddressEntity], { nullable: 'itemsAndList' })
  async getAddresses(
    @Parent() supplier: SupplierEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<AddressEntity[]> {
    if (!loaders) {
      throw new Error('Dataloader not initialized in context');
    }

    const loaderKey: AddressLoaderKey = {
      entityType: 1,
      entityNumber: supplier.supplierCode,
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
