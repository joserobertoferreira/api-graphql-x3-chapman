import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class DimensionTypeFilterInput {
  @Field({ nullable: true, description: 'The unique code for the dimension.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  dimension_equals?: string;

  @Field({ nullable: true, description: 'Search term for the dimension description.' })
  @IsString()
  @IsOptional()
  description_contains?: string;
}
