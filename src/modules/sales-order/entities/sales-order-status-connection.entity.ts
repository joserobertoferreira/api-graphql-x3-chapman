import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { SalesOrderStatusEntity } from './sales-order-status.entity';

@ObjectType()
export class SalesOrderStatusConnection extends Paginated(SalesOrderStatusEntity) {}
