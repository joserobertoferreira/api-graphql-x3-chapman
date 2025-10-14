import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAddressInput } from '../../addresses/dto/create-address.input';

@InputType()
export class CreateSupplierInput {
  @Field(() => String, { description: 'The category of the supplier.' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @Field({ nullable: true, description: 'The unique code for the new supplier.' })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(15)
  supplierCode?: string;

  @Field(() => String, { description: 'Supplier name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(75)
  name: string;

  @Field(() => String, { nullable: true, description: 'Short name for the supplier, if applicable.' })
  @IsString()
  @IsOptional()
  shortName?: string;

  @Field(() => String, { nullable: true, description: 'European VAT Number' })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(20)
  europeanUnionVatNumber?: string;

  @Field(() => String, { nullable: true, description: 'The language preference for the supplier.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this supplier.' })
  defaultAddress: CreateAddressInput;
}
