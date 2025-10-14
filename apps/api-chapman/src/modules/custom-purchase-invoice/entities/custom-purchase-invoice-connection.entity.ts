import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { CustomPurchaseInvoiceEntity } from './custom-purchase-invoice.entity';

@ObjectType()
export class CustomPurchaseInvoiceConnection extends Paginated(CustomPurchaseInvoiceEntity) {}
