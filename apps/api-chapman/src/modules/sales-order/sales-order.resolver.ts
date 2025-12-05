import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { BaseResolver } from '../../common/resolvers/base.resolver';
import { CloseSalesOrderLineInput } from './dto/close-sales-order-line.input';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderConnection } from './entities/sales-order-connection.entity';
import { ClosedSalesOrderEntity, SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderViewService } from './sales-order-view.service';
import { SalesOrderService } from './sales-order.service';

@Resolver(() => SalesOrderEntity)
export class SalesOrderResolver extends BaseResolver {
  constructor(
    private readonly salesOrderService: SalesOrderService,
    private readonly salesOrderViewService: SalesOrderViewService,
  ) {
    super();
  }

  @Mutation(() => SalesOrderEntity, { name: 'createSalesOrder' })
  createSalesOrder(@Args('input') input: CreateSalesOrderInput) {
    return this.salesOrderService.create(input, false);
  }

  @Mutation(() => ClosedSalesOrderEntity, { name: 'closeSalesOrderLines' })
  closeSalesOrderLine(@Args('input') input: CloseSalesOrderLineInput) {
    return this.salesOrderService.closeSalesOrderLines(input);
  }

  @Query(() => SalesOrderConnection, { name: 'getSalesOrders' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => SalesOrderFilterInput, nullable: true })
    filter?: SalesOrderFilterInput,
  ) {
    return this.salesOrderViewService.findPaginated(paginationArgs, filter);
  }
}
