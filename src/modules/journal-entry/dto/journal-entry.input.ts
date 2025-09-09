import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';
import { JournalEntryLineInput } from './journal-entry-line.input';

@InputType({ description: 'Data to create a journal entry, include header and lines' })
export class CreateJournalEntryInput {
  @Field(() => String, { description: 'Company' })
  @IsNotEmpty()
  @IsString()
  company: string;

  @Field(() => String, { description: 'Site' })
  @IsNotEmpty()
  @IsString()
  site: string;

  @Field(() => String, { description: 'Document type' })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @Field(() => String, { description: 'Description by default' })
  @IsString()
  @IsNotEmpty()
  descriptionByDefault: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Entry date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  entryDate?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Due date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  dueDate?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Value date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  valueDate?: Date;

  @Field(() => String, { nullable: true, description: 'Source document' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sourceDocument?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Source document date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  sourceDocumentDate?: Date;

  @Field(() => ExchangeRateTypeGQL, { nullable: true, description: 'Rate type of currency rate.' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsEnum(ExchangeRateTypeGQL, { message: 'If provided, rateType must be a valid enum value.' })
  rateType?: ExchangeRateTypeGQL;

  @Field(() => String, { description: 'Source currency.' })
  @IsNotEmpty()
  @IsString()
  sourceCurrency: string;

  @Field(() => String, { nullable: true, description: 'Reference.' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  reference?: string;

  @Field(() => [JournalEntryLineInput], { description: 'The detail lines of the journal entry.' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2, { message: 'A journal entry must have at least two lines (one debit and one credit).' })
  @Type(() => JournalEntryLineInput)
  lines: JournalEntryLineInput[];
}
