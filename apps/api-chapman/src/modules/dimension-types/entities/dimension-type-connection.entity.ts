import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { DimensionTypeEntity } from './dimension-type.entity';

@ObjectType()
export class DimensionTypeConnection extends Paginated(DimensionTypeEntity) {}
