import { Args, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { SalesOrderStatusFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderStatusConnection } from './entities/sales-order-status-connection.entity';
import { SalesOrderStatusEntity } from './entities/sales-order-status.entity';
import { SalesOrderStatusService } from './sales-order-status.service';

@Resolver(() => SalesOrderStatusEntity)
export class SalesOrderStatusResolver {
  constructor(private readonly salesOrderStatusService: SalesOrderStatusService) {}

  @Query(() => SalesOrderStatusConnection, { name: 'getSalesOrdersStatus' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => SalesOrderStatusFilterInput, nullable: true })
    filter?: SalesOrderStatusFilterInput,
  ) {
    return this.salesOrderStatusService.findPaginated(paginationArgs, filter);
  }
}
