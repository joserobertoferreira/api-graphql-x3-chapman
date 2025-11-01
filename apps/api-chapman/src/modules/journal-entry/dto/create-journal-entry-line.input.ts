import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DimensionsInput } from '../../../common/inputs/dimension.input';

@InputType()
export class JournalEntryLineInput {
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

  @Field(() => DimensionsInput, { nullable: true, description: 'Journal entry dimensions for this specific line.' })
  @IsOptional()
  dimensions?: DimensionsInput;
}
