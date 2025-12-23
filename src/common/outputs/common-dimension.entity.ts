import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommonBusinessPartnerName')
export class CommonBusinessPartnerNameEntity {
  @Field(() => String, { description: 'The business partner code.' })
  code: string;

  @Field(() => String, { description: 'The business partner name.' })
  name: string;
}

@ObjectType('CommonDimension')
export class CommonDimensionEntity {
  @Field(() => String, { nullable: true, description: 'Fixture dimension detail.' })
  fixture?: string;

  @Field(() => String, { nullable: true, description: 'Broker dimension detail.' })
  broker?: string;

  @Field(() => String, { nullable: true, description: 'Department dimension detail.' })
  department?: string;

  @Field(() => String, { nullable: true, description: 'Location dimension detail.' })
  location?: string;

  @Field(() => String, { nullable: true, description: 'Type dimension detail.' })
  type?: string;

  @Field(() => String, { nullable: true, description: 'Product dimension detail.' })
  product?: string;

  @Field(() => String, { nullable: true, description: 'Analysis dimension detail.' })
  analysis?: string;
}
