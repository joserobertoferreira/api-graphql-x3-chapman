import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

@InputType()
class CompanyFilter {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more company codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter by one or more country codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  country_in?: string[];
}

// --- Filtros para SITE ---
@InputType()
class SiteFilter {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more site codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter sites by one or more countries' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  address_country_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter sites by one or more cities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  address_city_in?: string[];

  @Field({ nullable: true, description: 'Filter sites by an exact zip code' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  address_zipCode_equals?: string;
}

@InputType()
export class CompanyFilterInput {
  // Filtros que se aplicam diretamente à entidade Company
  @Field(() => CompanyFilter, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyFilter)
  company?: CompanyFilter;

  // Filtros que se aplicam aos Sites relacionados
  // A convenção `_some` significa "pelo menos um site deve corresponder"
  @Field(() => SiteFilter, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteFilter)
  sites_some?: SiteFilter;
}
