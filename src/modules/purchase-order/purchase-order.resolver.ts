import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { BaseResolver } from 'src/common/resolvers/base.resolver';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { PurchaseOrderFilterInput } from './dto/filter-purchase-order.input';
import { PurchaseOrderConnection } from './entities/purchase-order-connection.entity';
import { PurchaseOrderEntity } from './entities/purchase-order.entity';
import { PurchaseOrderViewService } from './purchase-order-view.service';
import { PurchaseOrderService } from './purchase-order.service';

@Resolver(() => PurchaseOrderEntity)
export class PurchaseOrderResolver extends BaseResolver {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly purchaseOrderViewService: PurchaseOrderViewService,
  ) {
    super();
  }

  @Mutation(() => PurchaseOrderEntity, { name: 'createPurchaseOrder' })
  createPurchaseOrder(@Args('input') input: CreatePurchaseOrderInput) {
    return this.purchaseOrderService.create(input, false);
  }

  // @Mutation(() => [PurchaseOrderLineEntity], { name: 'closePurchaseOrderLines' })
  // closePurchaseOrderLine(@Args('input') input: ClosePurchaseOrderLineInput) {
  //   return this.purchaseOrderService.closePurchaseOrderLines(input);
  // }

  @Query(() => PurchaseOrderConnection, { name: 'getPurchaseOrders' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => PurchaseOrderFilterInput, nullable: true })
    filter?: PurchaseOrderFilterInput,
  ) {
    return this.purchaseOrderViewService.findPaginated(paginationArgs, filter);
  }
}
