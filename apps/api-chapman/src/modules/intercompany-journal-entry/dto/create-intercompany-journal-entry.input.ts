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
import { IntercompanyJournalEntryLineInput } from './create-intercompany-journal-entry-line.input';

@InputType({ description: 'Data to create a intercompany journal entry, include header and lines' })
export class CreateIntercompanyJournalEntryInput {
  @Field(() => String, { description: 'Site' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  // @IsValidSite({ company: 'company' })
  site: string;

  company?: string;

  @Field(() => String, { description: 'Document type' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  documentType: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date - YYYY-MM-DD' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  accountingDate?: Date;

  @Field(() => String, { description: 'Description by default' })
  @IsString()
  @IsNotEmpty()
  description: string;

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
  currency: string;

  @Field(() => [IntercompanyJournalEntryLineInput], { description: 'The detail lines of the journal entry.' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'A journal entry must have at least one line.' })
  @Type(() => IntercompanyJournalEntryLineInput)
  lines: IntercompanyJournalEntryLineInput[];
}
