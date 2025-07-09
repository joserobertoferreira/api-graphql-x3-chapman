import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class DimensionInput {
  @Field({ description: 'The code of the dimension type (e.g., "DEP").' })
  @IsNotEmpty()
  @IsString()
  typeCode: string;

  @Field({ description: 'The value for the dimension (e.g., "SALES").' })
  @IsNotEmpty()
  @IsString()
  value: string;
}
