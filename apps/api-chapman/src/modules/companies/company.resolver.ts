import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { AddressLoaderKey, IDataloaders } from '../../dataloader/dataloader.service';
import { AddressService } from '../addresses/address.service';
import { AddressEntity } from '../addresses/entities/address.entity';
import { CompanyService } from './company.service';
import { CompanyFilterInput } from './dto/filter-company.input';
import { CompanyConnection } from './entities/company-connection.entity';
import { CompanyEntity } from './entities/company.entity';

@Resolver(() => CompanyEntity)
export class CompanyResolver {
  constructor(
    private readonly companyService: CompanyService,
    // private readonly siteService: SiteService,
    private readonly addressService: AddressService,
  ) {}

  @Query(() => CompanyConnection, { name: 'getCompanies' })
  async findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => CompanyFilterInput, nullable: true })
    filter: CompanyFilterInput,
  ) {
    return await this.companyService.findPaginated(paginationArgs, filter);
  }

  // @ResolveField('sites', () => [SiteEntity], { nullable: 'itemsAndList' })
  // async getSites(
  //   @Parent() company: CompanyEntity,
  //   @Context() { loaders }: { loaders: IDataloaders },
  // ): Promise<SiteEntity[]> {
  //   const siteModels = await loaders.sitesByCompanyLoader.load(company.company);

  //   return siteModels.map((site) => this.siteService.mapToEntity(site));
  // }

  @ResolveField('addresses', () => [AddressEntity], { nullable: 'itemsAndList' })
  async getCompanyAddresses(
    @Parent() company: CompanyEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<AddressEntity[]> {
    const key: AddressLoaderKey = { entityType: 2, entityNumber: company.company };
    const addressModels = await loaders.addressLoader.load(key);

    return addressModels.map((addr) => this.addressService.mapAddressToEntity(addr));
  }
}
