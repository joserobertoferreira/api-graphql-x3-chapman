import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAddressInput } from '../../addresses/dto/create-address.input';

// @InputType()
// export class CreateAddressInput {
//   @Field(() => String, { description: 'The unique code for the address.' })
//   code: string;

//   @Field(() => String, { nullable: true, description: 'A brief description of the address.' })
//   @IsString()
//   @IsOptional()
//   description?: string;

//   @Field(() => String, { description: 'The first line of the address.' })
//   @IsNotEmpty()
//   @IsString()
//   addressLine1: string;

//   @Field(() => String, { nullable: true, description: 'The second line of the address, if applicable.' })
//   @IsString()
//   @IsOptional()
//   addressLine2?: string;

//   @Field(() => String, { nullable: true, description: 'The third line of the address, if applicable.' })
//   @IsString()
//   @IsOptional()
//   addressLine3?: string;

//   @Field(() => String, { nullable: true, description: 'The postal or zip code for the address.' })
//   @IsString()
//   @IsOptional()
//   zipCode?: string;

//   @Field(() => String, { nullable: true, description: 'The city for the address.' })
//   @IsString()
//   @IsOptional()
//   city?: string;

//   @Field(() => String, { nullable: true, description: 'The state or province for the address.' })
//   @IsString()
//   @IsOptional()
//   state?: string;

//   @Field(() => String, { description: 'The country code for the address.' })
//   country: string;

//   @Field(() => [String], { nullable: true, description: 'List of phone numbers associated with the address.' })
//   @IsOptional()
//   @ArrayMaxSize(5, { message: 'A maximum of 5 phone numbers can be associated with an address.' })
//   phones?: string[];

//   @Field(() => [String], { nullable: true, description: 'List of email addresses associated with the address.' })
//   @IsOptional()
//   @ArrayMaxSize(5, { message: 'A maximum of 5 email addresses can be associated with an address.' })
//   emails?: string[];
// }

@InputType()
export class CreateCustomerInput {
  @Field({ description: 'The unique code for the new customer.' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  customerCode: string;

  @Field(() => String, { description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(75)
  name: string;

  @Field(() => String, { nullable: true, description: 'Short name for the customer, if applicable.' })
  @IsString()
  @IsOptional()
  shortName?: string;

  @Field(() => String, { description: 'The category of the customer.' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @Field(() => String, { description: 'European VAT Number' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  europeanUnionVatNumber: string;

  @Field(() => String, { nullable: true, description: 'The language preference for the customer.' })
  @IsString()
  @IsOptional()
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this customer.' })
  defaultAddress: CreateAddressInput;
}
