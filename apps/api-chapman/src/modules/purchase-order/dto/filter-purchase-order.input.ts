import { Field, InputType } from '@nestjs/graphql';
import { ArrayMinSize, IsArray, IsDate, IsOptional, IsString } from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';

@InputType()
export class PurchaseOrderFilterInput {
  @Field(() => [String], { nullable: 'itemsAndList', description: 'Filter by one or more order numbers.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one order number must be provided.' })
  orderNumber_in?: string[];

  @Field(() => String, { nullable: true, description: 'Filter by supplier code.' })
  supplier_equals?: string;

  @Field(() => String, { nullable: true, description: 'Filter by company.' })
  company_equals?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders created on or after this date.' })
  @IsOptional()
  @IsDate()
  orderDate_gte?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders created on or before this date.' })
  @IsOptional()
  @IsDate()
  orderDate_lte?: Date;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'Filter by fixture dimension.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one fixture dimension must be provided.' })
  fixtureDimension_in?: string[];
}
