import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class DimensionFilterInput {
  @Field({ description: 'The type of dimension to filter by. This field is required.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimensionTypeCode_equals: string;

  @Field({ nullable: true, description: 'The unique code for the dimension.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension_equals?: string;

  @Field(() => Boolean, { nullable: true, description: 'Filter by active/inactive status of the dimension.' })
  @IsOptional()
  @IsBoolean()
  isActive_equals?: boolean;

  @Field({ nullable: true, description: 'Search term for the dimension additional information.' })
  @IsString()
  @IsOptional()
  additionalInfo_contains?: string;

  @Field({ nullable: true, description: 'Company/Site/Group code for the dimension.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  companySiteGroup_equals?: string;

  @Field({ nullable: true, description: 'Pioneer reference for the dimension.' })
  @IsString()
  @IsOptional()
  pioneerReference_equals?: string;

  @Field(() => String, { nullable: true, description: 'Fixture customer code.' })
  @IsString()
  @IsOptional()
  fixtureCustomer_equals?: string;

  @Field(() => String, { nullable: true, description: 'Broker email address.' })
  @IsString()
  @IsOptional()
  brokerEmail_equals?: string;
}
