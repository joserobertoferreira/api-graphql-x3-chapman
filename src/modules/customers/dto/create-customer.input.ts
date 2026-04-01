import { Field, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAddressInput } from '../../addresses/dto/create-address.input';

@InputType()
export class CreateCustomerInput {
  @Field(() => String, { description: 'The category of the customer.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5, { message: 'Customer category must be at most 5 characters long.' })
  category: string;

  @Field(() => ID, { nullable: true, description: 'The unique code for the new customer.' })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(15, { message: 'Customer code must be at most 15 characters long.' })
  customerCode?: string;

  @Field(() => String, { description: 'Customer name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(75, { message: 'Customer name must be at most 75 characters long.' })
  name: string;

  @Field(() => String, { nullable: true, description: 'Short name for the customer, if applicable.' })
  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'Short name must be at most 10 characters long.' })
  shortName?: string;

  @Field(() => String, { nullable: true, description: 'European VAT Number' })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(20, { message: 'European VAT Number must be at most 20 characters long.' })
  europeanUnionVatNumber?: string;

  @Field(() => String, { nullable: true, description: 'The language preference for the customer.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  @MaxLength(3, { message: 'Language must be at most 3 characters long.' })
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this customer.' })
  defaultAddress: CreateAddressInput;
}
