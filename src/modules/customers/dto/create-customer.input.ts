import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAddressInput } from '../../addresses/dto/create-address.input';

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
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this customer.' })
  defaultAddress: CreateAddressInput;
}
