import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { ProductEntity } from './product.entity';

@ObjectType()
export class ProductConnection extends Paginated(ProductEntity) {}
