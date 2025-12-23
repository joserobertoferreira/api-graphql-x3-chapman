import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { UserEntity } from './user.entity';

@ObjectType()
export class UserConnection extends Paginated(UserEntity) {}
