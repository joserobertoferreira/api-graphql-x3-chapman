import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DimensionInput } from '../../../common/inputs/dimension.input';

@InputType()
export class JournalEntryLineInput {
  @Field(() => ID, { description: 'The general ledger account code.' })
  @IsNotEmpty()
  @IsString()
  account: string;

  @Field(() => ID, { nullable: true, description: 'The business partner code.' })
  @IsOptional()
  @IsString()
  businessPartner?: string;

  @Field(() => Float, { nullable: true, description: 'The debit amount for this line.' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  debit?: number;

  @Field(() => Float, { nullable: true, description: 'The credit amount for this line.' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  credit?: number;

  @Field(() => String, { nullable: true, description: 'Description for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @Field(() => String, { nullable: true, description: 'Free reference for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  freeReference?: string;

  @Field(() => ID, { nullable: true, description: 'Tax code for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  taxCode?: string;

  @Field(() => [DimensionInput], { nullable: 'itemsAndList', description: 'List of dimensions pairs (type and value)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionInput)
  @ArrayMinSize(0)
  dimensions?: DimensionInput[];
}
