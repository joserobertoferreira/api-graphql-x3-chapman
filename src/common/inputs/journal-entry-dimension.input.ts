import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class JournalEntryDimensionInput {
  @Field(() => String, { nullable: true, description: 'The code of fixture dimension. (e.g., "CFG01")' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  fixture?: string;

  @Field(() => String, { nullable: true, description: 'The code of broker dimension (e.g., "BRK01").' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  broker?: string;

  @Field(() => String, { nullable: true, description: 'The code of department dimension (e.g., "DEP01").' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  department?: string;

  @Field(() => String, { nullable: true, description: 'The code of location dimension (e.g., "LOC01").' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  location?: string;

  @Field(() => String, { nullable: true, description: 'The code of type dimension (e.g., "TYP01").' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  type?: string;

  @Field(() => String, { nullable: true, description: 'The code of product dimension (e.g., "PRD01").' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  product?: string;

  @Field(() => String, { nullable: true, description: 'The code of analysis dimension (e.g., "ANA01").' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  analysis?: string;
}
