import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('DimensionType')
export class DimensionTypeEntity {
  @Field(() => ID, { description: 'The unique code for the dimension type.' })
  dimension!: string;

  @Field({ description: 'The description of the dimension type.' })
  description!: string;
}
