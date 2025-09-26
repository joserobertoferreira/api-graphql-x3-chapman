import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommonDimension')
export class CommonDimensionEntity {
  @Field(() => String, { description: 'The dimension code.' })
  code: string;
}

@ObjectType('CommonBusinessPartnerName')
export class CommonBusinessPartnerNameEntity {
  @Field(() => String, { description: 'The business partner code.' })
  code: string;

  @Field(() => String, { description: 'The business partner name.' })
  name: string;
}
