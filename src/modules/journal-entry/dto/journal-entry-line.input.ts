import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

  @Field(() => Float, { defaultValue: 0, description: 'The debit amount for this line. Use 0 if it is a credit.' })
  @IsNumber()
  @Min(0)
  debit: number;

  @Field(() => Float, { defaultValue: 0, description: 'The credit amount for this line. Use 0 if it is a debit.' })
  @IsNumber()
  @Min(0)
  credit: number;

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
}
