import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { BaseResolver } from 'src/common/resolvers/base.resolver';
import { AddressLoaderKey, IDataloaders } from 'src/dataloader/dataloader.service';
import { AddressService } from '../addresses/address.service';
import { AddressEntity } from '../addresses/entities/address.entity';
import { SiteFilterInput } from './dto/filter-site.input';
import { SiteConnection } from './entities/site-connection.entity';
import { SiteEntity } from './entities/site.entity';
import { SiteService } from './site.service';

@Resolver(() => SiteEntity)
export class SiteResolver extends BaseResolver {
  constructor(
    private readonly siteService: SiteService,
    private readonly addressService: AddressService,
  ) {
    super();
  }

  @Query(() => SiteConnection, { name: 'getSites' })
  async findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => SiteFilterInput })
    filter: SiteFilterInput,
  ) {
    return await this.siteService.findPaginated(paginationArgs, filter);
  }

  @ResolveField('addresses', () => [AddressEntity])
  async getSiteAddresses(
    @Parent() site: SiteEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<AddressEntity[]> {
    const key: AddressLoaderKey = { entityType: 3, entityNumber: site.siteCode };

    const addressModels = await loaders.addressLoader.load(key);

    return addressModels.map((addr) => this.addressService.mapAddressToEntity(addr));
  }
}
