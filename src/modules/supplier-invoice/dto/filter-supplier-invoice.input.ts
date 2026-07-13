import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
class SupplierInvoiceLineFilter {
  @Field(() => [String], { nullable: true })
  businessPartner_in?: string[];
}

@InputType()
export class SupplierInvoiceFilterInput {
  // Filter to use with header
  @Field(() => [String], { nullable: true })
  invoiceNumber_in?: string[];

  @Field(() => [String], { nullable: true })
  supplierCode_in?: string[];

  // Filters to use with lines
  @Field(() => SupplierInvoiceLineFilter, {
    nullable: true,
    description: 'Find invoices that have AT LEAST ONE line matching these criteria.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierInvoiceLineFilter)
  lines_some?: SupplierInvoiceLineFilter;
}
