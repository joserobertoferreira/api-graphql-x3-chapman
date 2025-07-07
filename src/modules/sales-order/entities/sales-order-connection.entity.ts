import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { SalesOrderEntity } from './sales-order.entity';

@ObjectType()
export class SalesOrderConnection extends Paginated(SalesOrderEntity) {}
