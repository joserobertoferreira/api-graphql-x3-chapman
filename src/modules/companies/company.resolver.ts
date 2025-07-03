import { Args, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { CompanyService } from './company.service';
import { CompanyFilterInput } from './dto/filter-company.input';
import { CompanyConnection } from './entities/company-connection.entity';
import { CompanyEntity } from './entities/company.entity';

@Resolver(() => CompanyEntity)
export class CompanyResolver {
  constructor(private readonly companyService: CompanyService) {}

  @Query(() => CompanyConnection, { name: 'companies' })
  async findCompanies(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => CompanyFilterInput, nullable: true })
    filter?: CompanyFilterInput,
  ) {
    return this.companyService.findPaginated(paginationArgs, filter);
  }
}
