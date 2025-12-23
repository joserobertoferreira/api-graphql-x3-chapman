import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class SiteFilterInput {
  @Field(() => String, { nullable: true, description: 'Unique code for the site' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  siteCode_equals?: string;

  @Field(() => String, { nullable: true, description: 'Search term for site name' })
  @IsNotEmpty()
  @IsString()
  siteName_contains?: string;

  @Field(() => String, { nullable: true, description: 'Search term for Short title' })
  @IsOptional()
  @IsString()
  shortTitle_contains?: string;

  @Field(() => String, { nullable: true, description: 'Legal company code' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  legalCompany_equals?: string;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of countries' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one country must be provided.' })
  country_in?: string[];

  @Field(() => String, { nullable: true, description: 'Site Tax ID Number' })
  @IsOptional()
  @IsString()
  siteTaxIdNumber_equals?: string;
}
