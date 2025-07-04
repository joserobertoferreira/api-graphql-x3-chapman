import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ProductFilter {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more product codes.' })
  code_in?: string[];

  @Field({ nullable: true, description: 'Search term for product descriptions.' })
  description_contains?: string;

  @Field({ nullable: true, description: 'Filter by a specific product category code.' })
  categoryCode_equals?: string;

  @Field({ nullable: true, description: 'Search term for product tax level' })
  taxLevel_contains?: string;

  @Field({ nullable: true, description: 'Search term form product statistical group' })
  statisticalGroup_contains?: string;
}
