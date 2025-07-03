import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAddressInput } from '../../addresses/dto/create-address.input';

@InputType()
export class CreateSupplierInput {
  @Field({ description: 'The unique code for the new supplier.' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  supplierCode: string;

  @Field(() => String, { description: 'Supplier name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(75)
  name: string;

  @Field(() => String, { nullable: true, description: 'Short name for the supplier, if applicable.' })
  @IsString()
  @IsOptional()
  shortName?: string;

  @Field(() => String, { description: 'The category of the supplier.' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @Field(() => String, { description: 'European VAT Number' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  europeanUnionVatNumber: string;

  @Field(() => String, { nullable: true, description: 'The language preference for the supplier.' })
  @IsString()
  @IsOptional()
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this supplier.' })
  defaultAddress: CreateAddressInput;
}
