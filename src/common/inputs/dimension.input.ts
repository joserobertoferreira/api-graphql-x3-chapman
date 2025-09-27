import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class DimensionInput {
  @Field({ description: 'The code of the dimension type (e.g., "DEP").' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  typeCode: string;

  @Field({ description: 'The value for the dimension (e.g., "SALES").' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  value: string;
}

@InputType()
export class CommonDimensionFilterInput {
  @Field(() => [String], { nullable: true, description: 'The code of fixture dimension. (e.g., "CFG01")' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each fixture code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Fixture codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'fixtureCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  fixtureCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'The code of broker dimension (e.g., "BRK01").' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each broker code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Broker codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'brokerCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  brokerCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'The code of department dimension (e.g., "DEP01").' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each department code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Department codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'departmentCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  departmentCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'The code of location dimension (e.g., "LOC01").' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each location code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Location codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'locationCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  locationCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'The code of type dimension (e.g., "TYP01").' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each type code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Type codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'typeCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  typeCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'The code of product dimension (e.g., "PRD01").' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each product code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Product codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'productCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  productCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'The code of analysis dimension (e.g., "ANA01").' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each analysis code must be a string.' })
  @IsNotEmpty({ each: true, message: 'Analysis codes cannot be empty strings.' })
  @ArrayMinSize(1, { message: 'analysisCode_in cannot be an empty array.' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.toUpperCase() : item)) : value,
  )
  analysisCode_in?: string[];
}
