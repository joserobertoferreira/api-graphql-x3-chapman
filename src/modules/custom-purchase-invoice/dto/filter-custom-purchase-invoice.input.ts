import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';
import { DimensionValuesInput } from '../../../common/inputs/dimension.input';

@InputType()
export class CustomPurchaseInvoiceFilterInput {
  @Field(() => String, { nullable: true, description: 'Filter by company' })
  company?: string;

  @Field(() => String, { nullable: true, description: 'Filter by site' })
  site?: string;

  @Field(() => [String], { nullable: true, description: 'Filter by invoice numbers' })
  invoiceNumber_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter by supplier IDs' })
  billBySupplier_in?: string[];

  @Field(() => GraphQLDate, { nullable: true, description: 'Filter by issue date greater than or equal to' })
  accountingDate_gte?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Filter by issue date less than or equal to' })
  accountingDate_lte?: Date;

  @Field(() => DimensionValuesInput, { nullable: true, description: 'Filter by dimension values' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionValuesInput)
  dimensions?: DimensionValuesInput;
}
