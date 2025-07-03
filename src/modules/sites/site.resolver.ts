import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AddressLoaderKey, IDataloaders } from 'src/dataloader/dataloader.service';
import { AddressService } from '../addresses/address.service';
import { AddressEntity } from '../addresses/entities/address.entity';
import { SiteEntity } from './entities/site.entity';

@Resolver(() => SiteEntity)
export class SiteResolver {
  constructor(private readonly addressService: AddressService) {}

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
