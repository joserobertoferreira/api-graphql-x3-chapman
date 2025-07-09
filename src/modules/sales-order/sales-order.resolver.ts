import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CloseSalesOrderLineInput } from './dto/close-sales-order-line.input';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderConnection } from './entities/sales-order-connection.entity';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderService } from './sales-order.service';

@Resolver(() => SalesOrderEntity)
export class SalesOrderResolver {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Mutation(() => SalesOrderEntity, { name: 'createSalesOrder' })
  createSalesOrder(@Args('input') input: CreateSalesOrderInput) {
    return this.salesOrderService.create(input);
  }

  @Mutation(() => [SalesOrderLineEntity], { name: 'closeSalesOrderLines' })
  closeSalesOrderLine(@Args('input') input: CloseSalesOrderLineInput) {
    return this.salesOrderService.closeSalesOrderLines(input);
  }

  @Query(() => SalesOrderEntity, { name: 'salesOrder', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.salesOrderService.findOne(id);
  }

  @Query(() => SalesOrderConnection, { name: 'salesOrders' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => SalesOrderFilterInput, nullable: true })
    filter?: SalesOrderFilterInput,
  ) {
    return this.salesOrderService.findPaginated(paginationArgs, filter);
  }
}
