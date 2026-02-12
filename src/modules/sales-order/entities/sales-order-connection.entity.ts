import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { SalesOrderTextEntity } from './sales-order-text.entity';
import { SalesOrderEntity } from './sales-order.entity';

@ObjectType()
export class SalesOrderConnection extends Paginated(SalesOrderEntity) {}

@ObjectType()
export class SalesOrderTextConnection extends Paginated(SalesOrderTextEntity) {}
