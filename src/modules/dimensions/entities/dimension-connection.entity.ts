import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { DimensionEntity } from './dimension.entity';

@ObjectType()
export class DimensionConnection extends Paginated(DimensionEntity) {}
