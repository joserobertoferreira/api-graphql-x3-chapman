import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Dimension')
export class DimensionEntity {
  @Field(() => ID, { description: 'The unique code for the dimension value.' })
  dimension!: string;

  @Field({ description: 'The type of this dimension.' })
  dimensionType!: string;

  @Field()
  description!: string;
}
