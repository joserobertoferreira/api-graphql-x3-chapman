import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Represent an address' })
export class AddressEntity {
  @Field(() => Int)
  entityType!: number;

  @Field(() => String, { description: 'Entity number' })
  entityNumber!: string;

  @Field(() => String, { description: 'Address code' })
  code!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  addressLine1?: string;

  @Field(() => String, { nullable: true })
  addressLine2?: string;

  @Field(() => String, { nullable: true })
  addressLine3?: string;

  @Field(() => String, { nullable: true })
  zipCode?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  state?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  countryName?: string;

  @Field(() => [String], { nullable: true })
  phones?: string[];

  @Field(() => [String], { nullable: true })
  emails?: string[];

  @Field(() => Int, { nullable: true, description: 'Flag to set if is default address' })
  isDefault?: number;
}
