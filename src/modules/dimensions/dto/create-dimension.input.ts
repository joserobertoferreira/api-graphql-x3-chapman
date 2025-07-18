import { Field, ID, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';

@InputType()
export class OtherDimensionInput {
  @Field(() => ID, { description: 'The unique code for the dimension type.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimensionType!: string;

  @Field(() => String, { description: 'The unique code for the new dimension.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension!: string;
}

@InputType()
export class CreateDimensionInput {
  @Field(() => ID, { description: 'The unique code for the dimension type.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimensionType!: string;

  @Field(() => String, { description: 'The unique code for the new dimension.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension!: string;

  @Field(() => String, { nullable: true, description: 'Description for the dimension.' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true, description: 'Company/Site/Group code for the dimension.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  site?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Flight date - YYYYMMDD' })
  @IsOptional()
  @IsDate()
  flightDate?: Date;

  @Field(() => String, { nullable: true, description: 'Origin - Destination.' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Origin - Destination must be at most 20 characters long.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  originDestination?: string;

  @Field(() => String, { nullable: true, description: 'Flight Reference ID.' })
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Flight Reference ID must be at most 10 characters long.' })
  flightReferenceId?: string;

  @Field(() => String, { nullable: true, description: 'Customer code' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  customerCode?: string;

  @Field(() => String, { nullable: true, description: 'Broker email address' })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: 'Broker email must be a valid email address.' })
  brokerEmail?: string;

  @Field(() => [OtherDimensionInput], {
    nullable: true,
    description: 'List of other dimensions to be associated with this dimension.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherDimensionInput)
  @ArrayMinSize(1, { message: 'At least one other dimension is required.' })
  otherDimensions?: OtherDimensionInput[];
}
