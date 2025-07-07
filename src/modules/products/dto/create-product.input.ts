import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class CreateProductInput {
  @Field(() => ID, { description: 'The unique code for the new product.' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @Field({ description: 'The code of an existing Product Category to inherit properties.' })
  @IsNotEmpty()
  @IsString()
  productCategoryCode: string;

  @Field(() => [String], { description: 'List of descriptions. The first one is required.' })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one description is required.' })
  @ArrayMaxSize(3, { message: 'A maximum of 3 descriptions is allowed.' })
  @IsString({ each: true }) // Garante que todos os itens do array são strings
  descriptions: string[];

  @Field({
    nullable: true,
    description: 'Optional: Sales Unit. If not provided, will be inherited from the category.',
  })
  @IsOptional()
  @IsString()
  salesUnit?: string;

  @Field({
    nullable: true,
    description: 'Optional: Purchase Unit. If not provided, will be inherited from the category.',
  })
  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @Field(() => [String], {
    nullable: 'itemsAndList',
    description: 'Optional: List of tax levels. If not provided, will be inherited from the category.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one tax level is required.' })
  @ArrayMaxSize(3, { message: 'A maximum of 3 tax levels is allowed.' })
  @IsString({ each: true })
  taxesLevel: string[];

  @Field(() => [String], {
    nullable: 'itemsAndList',
    description: 'Optional: List of product statistical groups. If not provided, will be inherited from the category.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'A maximum of 5 statistical groups is allowed.' })
  @IsString({ each: true })
  productStatisticalGroup?: string[];

  @Field(() => String, { nullable: true, description: 'Optional: The accounting code for the product.' })
  @IsOptional()
  @IsString()
  accountingCode?: string;

  @Field(() => Float, { nullable: true, description: 'Optional: The base price for the product.' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Base price must be a positive number.' })
  basePrice?: string;
}
