import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { SupplierEntity } from './supplier.entity';

@ObjectType()
export class SupplierConnection extends Paginated(SupplierEntity) {}
