import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { BaseResolver } from 'src/common/resolvers/base.resolver';
import { CreateSalesOrderTextInput } from './dto/create-sales-order-text.input';
import { SalesOrderTextEntity } from './entities/sales-order-text.entity';
import { SalesOrderTextService } from './sales-order-text.service';

@Resolver(() => SalesOrderTextEntity)
export class SalesOrderTextResolver extends BaseResolver {
  constructor(private readonly salesOrderTextService: SalesOrderTextService) {
    super();
  }

  @Mutation(() => SalesOrderTextEntity, { name: 'createSalesOrderText' })
  createSalesOrderText(@Args('input') input: CreateSalesOrderTextInput) {
    return this.salesOrderTextService.create(input);
  }
}
