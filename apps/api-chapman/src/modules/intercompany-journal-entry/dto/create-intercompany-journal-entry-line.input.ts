import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { JournalEntryCompanySiteInfo } from '../../../common/types/journal-entry.types';

@InputType()
export class IntercompanyJournalEntryLineInput {
  @Field(() => String, { description: 'Site' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  site: string;

  company?: JournalEntryCompanySiteInfo;

  @Field(() => ID, { description: 'The general ledger account code.' })
  @IsNotEmpty()
  @IsString()
  account: string;

  @Field(() => ID, { nullable: true, description: 'The business partner code.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  businessPartner?: string;

  @Field(() => Float, { nullable: true, description: 'The debit amount for this line.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  debit?: number;

  @Field(() => Float, { nullable: true, description: 'The credit amount for this line.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number;

  @Field(() => Float, { nullable: true, description: 'The quantity for this line.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @Field(() => String, { nullable: true, description: 'Description for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lineDescription?: string;

  @Field(() => String, { nullable: true, description: 'Tax code for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  taxCode?: string;

  @Field(() => DimensionsInput, { nullable: true, description: 'Journal entry dimensions for this specific line.' })
  @IsOptional()
  dimensions?: DimensionsInput;
}
