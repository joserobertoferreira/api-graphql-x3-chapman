import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
class PurchaseInvoiceLineFilter {
  @Field(() => [String], { nullable: true })
  product_in?: string[];

  @Field({ nullable: true })
  purchaseOrder_equals?: string;
}

@InputType()
export class PurchaseInvoiceFilterInput {
  // Filtros que se aplicam ao CABEÇALHO
  @Field(() => [String], { nullable: true })
  invoiceNumber_in?: string[];

  @Field(() => [String], { nullable: true })
  supplierCode_in?: string[];

  // Filtros que se aplicam às LINHAS
  @Field(() => PurchaseInvoiceLineFilter, {
    nullable: true,
    description: 'Find invoices that have AT LEAST ONE line matching these criteria.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PurchaseInvoiceLineFilter)
  lines_some?: PurchaseInvoiceLineFilter;
}
