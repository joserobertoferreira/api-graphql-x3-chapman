import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class DimensionFilterInput {
  @Field({ description: 'The type of dimension to filter by. This field is required.' })
  @IsNotEmpty()
  @IsString()
  dimensionTypeCode_equals!: string;

  @Field({ nullable: true, description: 'Search term for the dimension description.' })
  @IsString()
  @IsOptional()
  description_contains?: string;
}
