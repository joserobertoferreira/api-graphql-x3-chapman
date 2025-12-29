import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { AccountBalanceEntity } from './account-balance.entity';

@ObjectType()
export class AccountBalanceConnection extends Paginated(AccountBalanceEntity) {}
