import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { JournalEntryDimensionInput } from '../../../common/inputs/journal-entry-dimension.input';

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

  @Field(() => String, { nullable: true, description: 'Tax code for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  taxCode?: string;

  @Field(() => JournalEntryDimensionInput, { nullable: true, description: 'List of dimensions pairs (type and value)' })
  @IsOptional()
  dimensions?: JournalEntryDimensionInput;
}
