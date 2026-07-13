import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { SupplierInvoiceEntity } from './supplier-invoice.entity';

@ObjectType()
export class SupplierInvoiceConnection extends Paginated(SupplierInvoiceEntity) {}
