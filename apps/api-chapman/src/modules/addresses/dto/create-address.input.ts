import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field(() => String, { description: 'The unique code for the address.' })
  code: string;

  @Field(() => String, { nullable: true, description: 'A brief description of the address.' })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => String, { description: 'The first line of the address.' })
  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @Field(() => String, { nullable: true, description: 'The second line of the address, if applicable.' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @Field(() => String, { nullable: true, description: 'The third line of the address, if applicable.' })
  @IsString()
  @IsOptional()
  addressLine3?: string;

  @Field(() => String, { nullable: true, description: 'The postal or zip code for the address.' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @Field(() => String, { nullable: true, description: 'The city for the address.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  city?: string;

  @Field(() => String, { nullable: true, description: 'The state or province for the address.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  state?: string;

  @Field(() => String, { description: 'The country code for the address.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  country: string;

  @Field(() => [String], { nullable: true, description: 'List of phone numbers associated with the address.' })
  @IsOptional()
  @ArrayMaxSize(5, { message: 'A maximum of 5 phone numbers can be associated with an address.' })
  phones?: string[];

  @Field(() => [String], { nullable: true, description: 'List of email addresses associated with the address.' })
  @IsOptional()
  @ArrayMaxSize(5, { message: 'A maximum of 5 email addresses can be associated with an address.' })
  emails?: string[];
}
