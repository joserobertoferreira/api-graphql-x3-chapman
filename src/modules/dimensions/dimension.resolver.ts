import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { IDataloaders } from '../../dataloader/dataloader.service';
import { DimensionService } from './dimension.service';
import { CreateDimensionInput } from './dto/create-dimension.input';
import { DimensionFilterInput } from './dto/filter-dimension.input';
import { DimensionConnection } from './entities/dimension-connection.entity';
import { CustomerDimensionEntity, DimensionEntity } from './entities/dimension.entity';

@Resolver(() => DimensionEntity)
export class DimensionResolver {
  constructor(private readonly dimensionService: DimensionService) {}

  @Mutation(() => DimensionEntity, { name: 'createDimension' })
  createDimension(@Args('input', { type: () => CreateDimensionInput }) input: CreateDimensionInput) {
    return this.dimensionService.create(input);
  }

  @Query(() => DimensionConnection, { name: 'dimensions' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => DimensionFilterInput })
    filter: DimensionFilterInput,
  ) {
    return this.dimensionService.findPaginated(paginationArgs, filter);
  }

  @ResolveField('fixtureCustomer', () => CustomerDimensionEntity, { nullable: true })
  async resolveFixtureCustomer(
    @Parent() dimension: DimensionEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<CustomerDimensionEntity | null> {
    const findCustomer = dimension.fixtureCustomerCode?.trim();

    if (!findCustomer) {
      return null;
    }

    // Use the customer loader to fetch the customer by code
    try {
      const customer = await loaders.businessPartnerLoader.load(findCustomer);
      if (customer instanceof Error || !customer) {
        console.warn(`Fixture customer with code "${findCustomer}" not found, but was expected.`);
        return null;
      }

      return {
        customerCode: customer.code,
        customerName: customer.partnerName1,
      };
    } catch (error) {
      console.error(`Failed to load fixture customer ${findCustomer}.`, error);
      return null;
    }
  }
}
