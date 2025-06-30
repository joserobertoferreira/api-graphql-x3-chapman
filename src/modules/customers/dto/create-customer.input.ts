import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field()
  code: string;

  @Field()
  @IsString()
  @IsOptional()
  description?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  addressLine3?: string;

  @Field()
  zipCode: string;

  @Field()
  city: string;

  @Field()
  state: string;

  @Field()
  country: string;
}

@InputType()
export class CreateCustomerInput {
  @Field({ description: 'The unique code for the new customer.' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  customerCode: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(75)
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  shortName?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  category: string;

  @Field({ description: 'European VAT Number' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  europeanUnionVatNumber: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this customer.' })
  defaultAddress: CreateAddressInput;
}
