import { Field, InputType } from '@nestjs/graphql';
import { ArrayMinSize, IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';
import { OrderStatusGQL } from '../../../common/registers/enum-register';

@InputType()
export class SalesOrderFilterInput {
  @Field(() => [String], { nullable: 'itemsAndList', description: 'Filter by one or more order numbers.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one order number must be provided.' })
  orderNumber_in?: string[];

  @Field(() => String, { nullable: true, description: 'Filter by customer code.' })
  customerCode_equals?: string;

  @Field(() => String, { nullable: true, description: 'Filter by company.' })
  company_equals?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders on or after this date.' })
  @IsOptional()
  @IsDate()
  orderDate_gte?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders on or before this date.' })
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

@InputType()
export class SalesOrderStatusFilterInput {
  @Field(() => String, { nullable: true, description: 'Order number to filter by.' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  orderNumber_equals?: string;

  @Field(() => OrderStatusGQL, { nullable: true, description: 'Order status to filter by.' })
  @IsOptional()
  @IsEnum(OrderStatusGQL)
  orderStatus_equals?: OrderStatusGQL;

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders on or after this date.' })
  @IsOptional()
  @IsDate()
  orderDate_gte?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders on or before this date.' })
  @IsOptional()
  @IsDate()
  orderDate_lte?: Date;
}
