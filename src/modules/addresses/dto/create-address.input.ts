import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field(() => String, { description: 'The unique code for the address.' })
  code: string;

  @Field(() => String, { nullable: true, description: 'A brief description of the address.' })
  @IsString()
  @IsOptional()
  @MaxLength(30, { message: 'Description must be at most 30 characters long.' })
  description?: string;

  @Field(() => String, { description: 'The first line of the address.' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(75, { message: 'Address line 1 must be at most 75 characters long.' })
  addressLine1: string;

  @Field(() => String, { nullable: true, description: 'The second line of the address, if applicable.' })
  @IsString()
  @IsOptional()
  @MaxLength(75, { message: 'Address line 2 must be at most 75 characters long.' })
  addressLine2?: string;

  @Field(() => String, { nullable: true, description: 'The third line of the address, if applicable.' })
  @IsString()
  @IsOptional()
  @MaxLength(75, { message: 'Address line 3 must be at most 75 characters long.' })
  addressLine3?: string;

  @Field(() => String, { nullable: true, description: 'The postal or zip code for the address.' })
  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'Zip code must be at most 10 characters long.' })
  zipCode?: string;

  @Field(() => String, { nullable: true, description: 'The city for the address.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  @MaxLength(40, { message: 'City must be at most 40 characters long.' })
  city?: string;

  @Field(() => String, { nullable: true, description: 'The state or province for the address.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  @MaxLength(35, { message: 'State must be at most 35 characters long.' })
  state?: string;

  @Field(() => String, { description: 'The country code for the address.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(3, { message: 'Country code must be at most 3 characters long.' })
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
