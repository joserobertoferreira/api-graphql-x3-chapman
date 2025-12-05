import { Query, Resolver } from '@nestjs/graphql';
import { BaseResolver } from '../../common/resolvers/base.resolver';
import { DimensionTypeService } from './dimension-type.service';
import { DimensionTypeEntity } from './entities/dimension-type.entity';

@Resolver(() => DimensionTypeEntity)
export class DimensionTypeResolver extends BaseResolver {
  constructor(private readonly dimensionTypeService: DimensionTypeService) {
    super();
  }

  @Query(() => [DimensionTypeEntity], { name: 'getDimensionTypes' })
  async findAll() {
    return this.dimensionTypeService.findAll();
  }

  // @Query(() => DimensionTypeEntity, { name: 'dimensionType', nullable: true })
  // async findOne(@Args('dimension', { type: () => ID }) dimension: string) {
  //   return this.dimensionTypeService.findOne(dimension);
  // }
}
