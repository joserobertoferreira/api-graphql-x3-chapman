import { Field, Float, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';
import { DimensionsInput } from '../../../common/inputs/dimension.input';

@InputType()
export class PurchaseOrderLineInput {
  @Field(() => String, { description: 'Product SKU' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  product!: string;

  @Field(() => Float, { description: 'Quantity of the product in Purchase unit' })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Field(() => Float, { nullable: true, description: 'Unit price of the product' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  grossPrice?: number;

  @Field(() => String, { nullable: true, description: 'Tax level code for the product' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  taxLevelCode?: string;

  // @Field(() => [DimensionInput], { nullable: 'itemsAndList', description: 'List of dimensions pairs (type and value)' })
  // @IsOptional()
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => DimensionInput)
  // @ArrayMinSize(1, { message: 'At least one other dimension is required.' })
  // dimensions?: DimensionInput[];

  @Field(() => DimensionsInput, { nullable: true, description: 'Dimensions for this specific line.' })
  @IsOptional()
  dimensions?: DimensionsInput;
}

@InputType({ description: 'Data to create a Purchase order, include header and lines' })
export class CreatePurchaseOrderInput {
  @Field(() => String, { description: 'Purchase site' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  purchaseSite: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Order date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  orderDate?: Date;

  @Field(() => String, { description: 'Supplier code' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  supplier: string;

  @Field(() => String, { nullable: true, description: 'Buyer code' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, buyer cannot be empty.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  buyer?: string;

  @Field(() => String, { nullable: true, description: 'Tax rule' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, taxRule cannot be empty.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  taxRule?: string;

  @Field(() => String, { nullable: true, description: 'Currency code' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, currency cannot be empty.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  currency?: string;

  @Field(() => [PurchaseOrderLineInput], { description: 'An array with all products to order.' })
  @IsArray()
  @ValidateNested({ each: true }) // Ensure each item in the array is validated
  @ArrayMinSize(1, { message: 'At least one line item is required.' })
  @Type(() => PurchaseOrderLineInput)
  lines: PurchaseOrderLineInput[];
}
