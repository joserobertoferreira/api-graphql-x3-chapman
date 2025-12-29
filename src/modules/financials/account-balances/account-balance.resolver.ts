import { Args, Info, Query, Resolver } from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { BaseResolver } from 'src/common/resolvers/base.resolver';
import { AccountBalanceService } from './account-balance.service';
import { AccountBalanceFilter } from './dto/filter-account-balance.input';
import { AccountBalanceConnection } from './entities/account-balance-connection.entity';
import { AccountBalanceEntity } from './entities/account-balance.entity';
import { AccountBalanceValidationService } from './validators/account-balance-validation.service';

@Resolver(() => AccountBalanceEntity)
export class AccountBalanceResolver extends BaseResolver {
  constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountBalanceValidationService: AccountBalanceValidationService,
  ) {
    super();
  }

  // Query paginada e com filtros para buscar múltiplos produtos
  @Query(() => AccountBalanceConnection, { name: 'getAccountBalances' })
  async findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Info() info: GraphQLResolveInfo,
    @Args('filter', { type: () => AccountBalanceFilter, nullable: true }) filter?: AccountBalanceFilter,
  ): Promise<AccountBalanceConnection> {
    console.log('Received filter:', filter);

    let processedFilter = filter ? { ...filter } : undefined;

    if (processedFilter) {
      const fiscalYear = await this.accountBalanceValidationService.validate(processedFilter);

      if (fiscalYear !== undefined) {
        delete (processedFilter as any).fiscalYear_equals;

        (processedFilter as any).fiscalYear_equals = fiscalYear;
      }
    }

    console.log('Received filter:', processedFilter);

    const fetchTotalCount = this.isFieldRequested(info, 'totalCount');

    return this.accountBalanceService.findPaginated(paginationArgs, processedFilter, fetchTotalCount);
  }

  /**
   * Check if a specific field is requested in the GraphQL query.
   */
  private isFieldRequested(info: GraphQLResolveInfo, fieldName: string): boolean {
    // A 'info.fieldNodes' contém a árvore da query.
    // Percorremos os nós de seleção para ver se 'fieldName' está lá.
    const selections = info.fieldNodes[0]?.selectionSet?.selections;
    if (!selections) {
      return false;
    }
    return selections.some((selection) => 'name' in selection && selection.name.value === fieldName);
  }
}
