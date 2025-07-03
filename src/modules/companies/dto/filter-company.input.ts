import { Field, InputType } from '@nestjs/graphql';

@InputType()
class CompanyFilter {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more company codes' })
  companyCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter by one or more country codes' })
  country_in?: string[];
}

// --- Filtros para SITE ---
@InputType()
class SiteFilter {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more site codes' })
  siteCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter sites by one or more countries' })
  address_country_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter sites by one or more cities' })
  address_city_in?: string[];

  @Field({ nullable: true, description: 'Filter sites by an exact zip code' })
  address_zipCode_equals?: string;
}

@InputType()
export class CompanyFilterInput {
  // Filtros que se aplicam diretamente à entidade Company
  @Field(() => CompanyFilter, { nullable: true })
  company?: CompanyFilter;

  // Filtros que se aplicam aos Sites relacionados
  // A convenção `_some` significa "pelo menos um site deve corresponder"
  @Field(() => SiteFilter, { nullable: true })
  sites_some?: SiteFilter;
}
