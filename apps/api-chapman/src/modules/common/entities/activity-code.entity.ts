import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ActivityCodeDimensionEntity {
  @Field(() => Number, { description: 'Activity code screen size' })
  screenSize: number;
}
