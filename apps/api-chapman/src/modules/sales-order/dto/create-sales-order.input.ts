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
export class SalesOrderLineInput {
  @Field(() => String, { description: 'Product SKU' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  product!: string;

  @Field(() => Float, { description: 'Quantity of the product in sales unit' })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Field(() => Float, { nullable: true, description: 'Unit price of the product' })
  @IsOptional()
  @IsNumber()
  @Min(0)
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

  purchaseOrder?: string;
  purchaseOrderLine?: number;
  purchaseOrderSequence?: number;
}

@InputType({ description: 'Data to create a sales order, include header and lines' })
export class CreateSalesOrderInput {
  @Field(() => String, { description: 'Sales site' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  salesSite: string;

  @Field(() => String, { nullable: true, description: 'Sales order type' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  salesOrderType?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Order date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  orderDate?: Date;

  @Field(() => String, { description: 'Sold-to-customer code' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  soldToCustomer: string;

  // @Field(() => String, { nullable: true, description: 'Reference' })
  // customerOrderReference?: string;

  // @Field(() => String, { nullable: true, description: 'Delivery address code' })
  // shipToCustomerAddress?: string;

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

  // @Field(() => Int, { nullable: true, description: 'Price (1) - tax / (2) + tax' })
  // priceIncludingOrExcludingTax?: number;

  // @Field(() => String, { nullable: true, description: 'Shipment site' })
  // shipmentSite?: string;

  // @Field(() => GraphQLDate, { nullable: true, description: 'Requested delivery date - YYYY-MM-DD' })
  // requestedDeliveryDate?: Date;

  // @Field(() => GraphQLDate, { nullable: true, description: 'Shipment date - YYYY-MM-DD' })
  // shipmentDate?: Date;

  // @Field(() => String, { nullable: true, description: 'Payment term' })
  // paymentTerm?: string;

  @Field(() => [SalesOrderLineInput], { description: 'An array with all products to order.' })
  @IsArray()
  @ValidateNested({ each: true }) // Ensure each item in the array is validated
  @ArrayMinSize(1, { message: 'At least one line item is required.' })
  @Type(() => SalesOrderLineInput)
  lines: SalesOrderLineInput[];

  customerOrderReference?: string;
  shippingSite?: string;
  partialDelivery?: number;
  isIntersite?: number;
  isIntercompany?: number;
  sourceSite?: string;
}
