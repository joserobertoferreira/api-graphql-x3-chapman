import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';

@InputType()
export class CurrencyRateFilterInput {
  @Field({ description: 'The type of currency rate to filter by. This field is required.' })
  @IsNotEmpty()
  @IsEnum(ExchangeRateTypeGQL)
  rateType_equals!: ExchangeRateTypeGQL;

  @Field(() => GraphQLDate, { description: 'Search rates for the date provided (YYYY-MM-DD).' })
  @IsDate()
  rateDate_equals!: Date;

  // @Field(() => GraphQLDate, { nullable: true, description: 'Find rates on or after this date (YYYY-MM-DD).' })
  // @IsOptional()
  // @IsDate()
  // rateDate_gte?: Date;

  // @Field(() => GraphQLDate, { nullable: true, description: 'Find rates on or before this date (YYYY-MM-DD).' })
  // @IsOptional()
  // @IsDate()
  // rateDate_lte?: Date;

  @Field({ description: 'The source currency.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  sourceCurrency_equals!: string;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of destination currencies.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one currency must be provided.' })
  destinationCurrency_in?: string[];
}
