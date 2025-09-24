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
  dimensionType: string;

  @Field(() => String, { description: 'The unique code for the new dimension.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension: string;
}

@InputType()
export class GeneralDimensionInput {
  @Field(() => String, { nullable: true, description: 'Company/Site/Group code for the dimension.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  companySiteGroup?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Dimension valid from date - YYYY-MM-DD.' })
  @IsOptional()
  @IsDate()
  validFrom?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Dimension valid until date - YYYY-MM-DD.' })
  @IsOptional()
  @IsDate()
  validUntil?: Date;

  @Field(() => String, { nullable: true, description: 'Fixture customer code.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  fixtureCustomer?: string;

  @Field(() => String, { nullable: true, description: 'Broker email address.' })
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

@InputType()
export class ServiceDimensionInput {
  @Field(() => GraphQLDate, { nullable: true, description: 'Service start date - YYYY-MM-DD.' })
  @IsDate()
  serviceDateStart?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Service end date - YYYY-MM-DD.' })
  @IsDate()
  serviceDateEnd?: Date;

  @Field(() => String, { nullable: true, description: 'Sales person code.' })
  @IsOptional()
  @IsString()
  salesPerson?: string;
}

@InputType()
export class FlightDimensionInput {
  @Field(() => String, { description: 'Flight Reference ID.' })
  @IsString()
  @MaxLength(30, { message: 'Flight Reference ID must be at most 30 characters long.' })
  flightReference: string;

  @Field(() => GraphQLDate, { description: 'Flight date - YYYY-MM-DD.' })
  @IsDate()
  flightDate: Date;

  @Field(() => String, { description: 'Flight origin.' })
  @IsString()
  @MaxLength(5, { message: 'Flight Origin must be at most 5 characters long.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  flightOrigin: string;

  @Field(() => String, { description: 'Flight destination.' })
  @IsString()
  @MaxLength(5, { message: 'Flight Origin must be at most 5 characters long.' })
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  flightDestination: string;
}

@InputType()
export class CreateDimensionInput {
  @Field(() => ID, { description: 'The unique code for the dimension type.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimensionType: string;

  @Field(() => String, { description: 'The unique code for the new dimension.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension: string;

  @Field(() => String, { nullable: true, description: 'Additional information for the dimension.' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @Field(() => String, { nullable: true, description: 'Short title for the dimension.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Short title cannot be empty if provided.' })
  @MaxLength(12, { message: 'Short title must be at most 12 characters long.' })
  shortTitle?: string;

  @Field(() => String, { nullable: true, description: 'Pioneer reference for the dimension.' })
  @IsOptional()
  @IsString()
  pioneerReference?: string;

  @Field(() => GeneralDimensionInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralDimensionInput)
  general?: GeneralDimensionInput;

  @Field(() => ServiceDimensionInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceDimensionInput)
  service?: ServiceDimensionInput;

  @Field(() => FlightDimensionInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlightDimensionInput)
  flight?: FlightDimensionInput;
}
