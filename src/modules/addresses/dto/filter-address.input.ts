import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddressFilterInput {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more country codes (e.g., ["PT", "GB"])' })
  country_in?: string[];

  @Field({ nullable: true, description: 'Filter by city' })
  city_equals?: string;

  @Field({ nullable: true, description: 'Filter by zip code' })
  zipCode_equals?: string;
}
