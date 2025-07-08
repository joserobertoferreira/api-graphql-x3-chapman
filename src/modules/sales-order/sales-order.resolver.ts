import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CreateSalesOrderInput } from './dto/create-sales-order.input';
import { SalesOrderFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderConnection } from './entities/sales-order-connection.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderService } from './sales-order.service';

@Resolver(() => SalesOrderEntity)
export class SalesOrderResolver {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Mutation(() => SalesOrderEntity, { name: 'createSalesOrder' })
  createSalesOrder(@Args('input') input: CreateSalesOrderInput) {
    return this.salesOrderService.create(input);
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

  // === FIELD RESOLVERS ===
  // Nota: Os FieldResolvers para `customer` e `deliveryAddress` não são mais necessários
  // porque os dados já estão mapeados no `mapToEntity` a partir da tabela SORDER.

  // O FieldResolver para as linhas é opcional. Se você já as mapeia no `mapToEntity`
  // (como fizemos), não precisa de um resolver aqui. Mas se quisesse carregá-las
  // de forma preguiçosa, faria assim:
  /*
  @ResolveField('lines', () => [SalesOrderLineEntity])
  async getLines(
      @Parent() order: SalesOrder,
      @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<SalesOrderLineEntity[]> {
      // Lógica com DataLoader para buscar e mapear as linhas...
  }
  */
}
