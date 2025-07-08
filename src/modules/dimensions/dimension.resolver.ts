import { Args, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { DimensionService } from './dimension.service';
import { DimensionFilterInput } from './dto/filter-dimension.input';
import { DimensionConnection } from './entities/dimension-connection.entity';

@Resolver()
export class DimensionResolver {
  constructor(private readonly dimensionService: DimensionService) {}

  @Query(() => DimensionConnection, { name: 'dimensions' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => DimensionFilterInput })
    filter: DimensionFilterInput,
  ) {
    return this.dimensionService.findPaginated(paginationArgs, filter);
  }
}
