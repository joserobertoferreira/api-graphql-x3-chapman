import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

@InputType()
export class CompanyFilterInput {
  @Field(() => String, { nullable: true, description: 'Unique code for the company.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  company_equals?: string;

  @Field(() => String, { nullable: true, description: 'Search term for the company name' })
  @IsOptional()
  @IsString()
  companyName_contains?: string;

  @Field(() => String, { nullable: true, description: 'Search term for Short title' })
  @IsOptional()
  @IsString()
  shortTitle_contains?: string;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of legislation' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one legislation must be provided.' })
  legislation_in?: string[];

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of countries' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one country must be provided.' })
  country_in?: string[];

  @Field(() => String, { nullable: true, description: 'SIREN' })
  @IsOptional()
  @IsString()
  sirenNumber_equals?: string;

  @Field(() => String, { nullable: true, description: 'Unique identification number' })
  @IsOptional()
  @IsString()
  uniqueIdentificationNumber_equals?: string;

  @Field(() => String, { nullable: true, description: 'Intra-community VAT number' })
  @IsOptional()
  @IsString()
  intraCommunityVatNumber_equals?: string;
}

// @InputType()
// class CompanyFilter {
//   @Field(() => [String], { nullable: true, description: 'Filter by one or more company codes' })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   companyCode_in?: string[];

//   @Field(() => [String], { nullable: true, description: 'Filter by one or more country codes' })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   country_in?: string[];
// }

// // --- Filtros para SITE ---
// @InputType()
// class SiteFilter {
//   @Field(() => [String], { nullable: true, description: 'Filter by one or more site codes' })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   siteCode_in?: string[];

//   @Field(() => [String], { nullable: true, description: 'Filter sites by one or more countries' })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   address_country_in?: string[];

//   @Field(() => [String], { nullable: true, description: 'Filter sites by one or more cities' })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   address_city_in?: string[];

//   @Field({ nullable: true, description: 'Filter sites by an exact zip code' })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   address_zipCode_equals?: string;
// }

// @InputType()
// export class CompanyFilterInput {
//   // Filtros que se aplicam diretamente à entidade Company
//   @Field(() => CompanyFilter, { nullable: true })
//   @IsOptional()
//   @ValidateNested()
//   @Type(() => CompanyFilter)
//   company?: CompanyFilter;

//   // Filtros que se aplicam aos Sites relacionados
//   // A convenção `_some` significa "pelo menos um site deve corresponder"
//   @Field(() => SiteFilter, { nullable: true })
//   @IsOptional()
//   @ValidateNested()
//   @Type(() => SiteFilter)
//   sites_some?: SiteFilter;
// }
