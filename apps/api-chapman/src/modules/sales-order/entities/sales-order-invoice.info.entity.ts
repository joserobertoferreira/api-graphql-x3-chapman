import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { InvoiceAccountingStatusGQL, InvoiceTypeGQL } from '../../../common/registers/enum-register';

@ObjectType('paymentTerm')
export class SalesOrderPaymentTermInfo {
  @Field(() => String, { nullable: true, description: 'Payment term code.' })
  code?: string;

  @Field(() => String, { nullable: true, description: 'Payment term description.' })
  description?: string;
}

@ObjectType('lastSalesInvoice')
export class SalesOrderLastInvoiceInfo {
  @Field(() => String, { nullable: true, description: 'Last invoice number.' })
  invoiceNumber?: string;

  @Field(() => InvoiceTypeGQL, { nullable: true, description: 'Invoice category.' })
  category?: InvoiceTypeGQL;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date.' })
  accountingDate?: Date;

  @Field(() => SalesOrderPaymentTermInfo, { nullable: true, description: 'Payment term information.' })
  paymentTerm?: SalesOrderPaymentTermInfo;

  @Field(() => InvoiceAccountingStatusGQL, { nullable: true, description: 'Invoice status.' })
  status?: InvoiceAccountingStatusGQL;

  @Field(() => Int, { nullable: true, description: 'Invoice journal type.' })
  debitOrCredit?: number;

  @Field(() => Float, { description: 'The total amount of the order, including tax.' })
  totalAmountIncludingTax!: number;

  @Field(() => Float, { description: 'The total amount of the order, excluding tax.' })
  totalAmountExcludingTax!: number;

  @Field(() => Boolean, { description: 'Indicates if the order has been printed.' })
  isPrinted!: boolean;
}
