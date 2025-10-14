import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { PurchaseOrderEntity } from './purchase-order.entity';

@ObjectType()
export class PurchaseOrderConnection extends Paginated(PurchaseOrderEntity) {}
