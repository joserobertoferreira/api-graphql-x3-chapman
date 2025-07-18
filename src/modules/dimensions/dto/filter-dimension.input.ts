import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class DimensionFilterInput {
  @Field({ description: 'The type of dimension to filter by. This field is required.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimensionTypeCode_equals!: string;

  @Field({ nullable: true, description: 'The unique code for the dimension.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension_equals?: string;

  @Field({ nullable: true, description: 'Company/Site/Group code for the dimension.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  site_equals?: string;

  @Field({ nullable: true, description: 'Search term for the dimension description.' })
  @IsString()
  @IsOptional()
  description_contains?: string;
}
