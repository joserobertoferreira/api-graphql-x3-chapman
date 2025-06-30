import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { IsMutuallyExclusive } from '../../../common/validators/is-mutually-exclusive.validator';

@InputType()
export class CustomerFilter {
  @Field(() => String, { nullable: true, description: 'Filter customers by name (case-insensitive search)' })
  customerName?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true, description: 'Filter by European Union VAT Number' })
  europeanUnionVatNumber?: string;

  @Field(() => String, { nullable: true, description: 'Filter by country code (e.g., "PT"' })
  @IsOptional()
  @IsString()
  @IsMutuallyExclusive('countries', {
    message: 'You can only filter by either country or countries, not both.',
  })
  country?: string;

  @Field(() => [String], { nullable: true, description: 'Filter by a list of country codes (e.g., ["PT", "GB"]' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @Field(() => String, { nullable: true, description: 'Filter by city' })
  @IsOptional()
  @IsString()
  @IsMutuallyExclusive('cities', {
    message: 'You can only filter by either city or cities, not both.',
  })
  city?: string;

  @Field(() => [String], { nullable: true, description: 'Filter by a list of cities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];
}
