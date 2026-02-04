import { Args, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { BaseResolver } from '../../common/resolvers/base.resolver';
import { PaymentTermFilterInput } from './dto/filter-payment-term.input';
import { PaymentTermConnection } from './entities/payment-term-connection.entity';
import { PaymentTermEntity } from './entities/payment-term.entity';
import { PaymentTermService } from './payment-term.service';

@Resolver(() => PaymentTermEntity)
export class PaymentTermResolver extends BaseResolver {
  constructor(private readonly paymentTermService: PaymentTermService) {
    super();
  }

  @Query(() => PaymentTermConnection, { name: 'getPaymentTerms' })
  async findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => PaymentTermFilterInput, nullable: true })
    filter: PaymentTermFilterInput,
  ) {
    return await this.paymentTermService.findPaginated(paginationArgs, filter);
  }
}
