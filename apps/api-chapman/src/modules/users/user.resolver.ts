import { Args, Query, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { UserFilter } from './dto/filter-user.input';
import { UserConnection } from './entities/user-connection.entity';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';

@Resolver(() => UserEntity)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => UserConnection, { name: 'getUsers' })
  async findPaginated(
    @Args() args: PaginationArgs,
    @Args('filter', { type: () => UserFilter, nullable: true }) filter?: UserFilter,
  ) {
    return await this.userService.findPaginated(args, filter);
  }
}
