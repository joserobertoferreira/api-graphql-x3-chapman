import { Query, Resolver } from '@nestjs/graphql';
import { DimensionTypeService } from './dimension-type.service';
import { DimensionTypeEntity } from './entities/dimension-type.entity';

@Resolver(() => DimensionTypeEntity)
export class DimensionTypeResolver {
  constructor(private readonly dimensionTypeService: DimensionTypeService) {}

  @Query(() => [DimensionTypeEntity], { name: 'getDimensionTypes' })
  async findAll() {
    return this.dimensionTypeService.findAll();
  }

  // @Query(() => DimensionTypeEntity, { name: 'dimensionType', nullable: true })
  // async findOne(@Args('dimension', { type: () => ID }) dimension: string) {
  //   return this.dimensionTypeService.findOne(dimension);
  // }
}
