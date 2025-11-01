import { Field, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
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
import { IsCurrency } from '../../../common/decorators/common.decorator';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';
import { JournalEntryLineInput } from './create-journal-entry-line.input';

@InputType({ description: 'Data to create a journal entry, include header and lines' })
export class CreateJournalEntryInput {
  @Field(() => String, { description: 'Site' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  // @IsValidSite({ company: 'company' })
  site: string;

  @Field(() => String, { description: 'Document type' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  documentType: string;

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
  @IsNotEmpty()
  @IsDate()
  sourceDocumentDate?: Date;

  @Field(() => String, { nullable: true, description: 'Reference.' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  reference?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  accountingDate?: Date;

  @Field(() => String, { description: 'Description by default' })
  @IsString()
  @IsNotEmpty()
  descriptionByDefault: string;

  @Field(() => ExchangeRateTypeGQL, { nullable: true, description: 'Rate type of currency rate.' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsEnum(ExchangeRateTypeGQL, { message: 'If provided, rateType must be a valid enum value.' })
  rateType?: ExchangeRateTypeGQL;

  @Field(() => GraphQLDate, { nullable: true, description: 'Rate date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  rateDate?: Date;

  @Field(() => String, { description: 'Source currency.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  @IsCurrency()
  sourceCurrency: string;

  company?: string;

  @Field(() => [JournalEntryLineInput], { description: 'The detail lines of the journal entry.' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'A journal entry must have at least one line.' })
  @Type(() => JournalEntryLineInput)
  lines: JournalEntryLineInput[];
}
