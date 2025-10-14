import { Args, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { CurrencyRateService } from './currency-rate.service';
import { CurrencyRateFilterInput } from './dto/filter-currency-rate.input';
import { CurrencyRateConnection } from './entities/currency-rate-connection.entity';
import { CurrencyRateEntity } from './entities/currency-rate.entity';

@Resolver(() => CurrencyRateEntity)
export class CurrencyRateResolver {
  constructor(private readonly currencyRateService: CurrencyRateService) {}

  @Query(() => CurrencyRateConnection, { name: 'getExchangeRates' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => CurrencyRateFilterInput })
    filter: CurrencyRateFilterInput,
  ) {
    return this.currencyRateService.findPaginated(paginationArgs, filter);
  }
}
