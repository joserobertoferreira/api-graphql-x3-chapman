import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAddressInput } from '../../addresses/dto/create-address.input';

@InputType()
export class CreateSupplierInput {
  @Field(() => String, { description: 'The category of the supplier.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5, { message: 'Supplier category must be at most 5 characters long.' })
  category: string;

  @Field({ nullable: true, description: 'The unique code for the new supplier.' })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(15, { message: 'Supplier code must be at most 15 characters long.' })
  supplierCode?: string;

  @Field(() => String, { description: 'Supplier name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(75, { message: 'Supplier name must be at most 75 characters long.' })
  name: string;

  @Field(() => String, { nullable: true, description: 'Short name for the supplier, if applicable.' })
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

  @Field(() => String, { nullable: true, description: 'The language preference for the supplier.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  @MaxLength(3, { message: 'Language must be at most 3 characters long.' })
  language?: string;

  @Field(() => CreateAddressInput, { description: 'The default address for this supplier.' })
  defaultAddress: CreateAddressInput;
}
