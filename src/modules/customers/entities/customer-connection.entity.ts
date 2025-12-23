import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { CustomerEntity } from './customer.entity';

@ObjectType()
export class CustomerConnection extends Paginated(CustomerEntity) {}
