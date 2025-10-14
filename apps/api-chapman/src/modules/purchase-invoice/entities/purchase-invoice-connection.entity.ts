import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { PurchaseInvoiceEntity } from './purchase-invoice.entity';

@ObjectType()
export class PurchaseInvoiceConnection extends Paginated(PurchaseInvoiceEntity) {}
