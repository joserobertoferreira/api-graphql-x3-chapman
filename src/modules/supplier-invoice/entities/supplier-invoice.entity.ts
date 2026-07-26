import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';

@ObjectType('SupplierInvoice')
export class SupplierInvoiceEntity {
  @Field(() => String, { nullable: true, description: 'Invoice category' })
  category?: string;
  @Field(() => ID, { description: 'Unique identifier for the supplier invoice.' })
  invoiceNumber!: string;

  @Field(() => String, { nullable: true, description: 'The site associated with the invoice.' })
  site?: string;

  @Field(() => String, { nullable: true, description: 'The invoice Type.' })
  invoiceType?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'The date of the invoice.' })
  accountingDate?: Date;

  @Field(() => String, { nullable: true, description: 'The collective assigned to the invoice.' })
  collective?: string;

  @Field(() => String, { nullable: true, description: 'The supplier code associated with the invoice.' })
  supplier?: string;

  @Field(() => String, { nullable: true, description: 'Pay to code.' })
  payToBusinessPartner?: string;

  @Field(() => String, { nullable: true, description: 'Tax rule code.' })
  taxRule?: string;

  @Field(() => String, { nullable: true, description: 'Source document number.' })
  sourceDocument?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Source document date.' })
  sourceDocumentDate?: Date;

  @Field(() => String, { nullable: true, description: 'Invoice currency.' })
  currency?: string;

  @Field(() => Float, { nullable: true, description: 'Total amount excluding tax.' })
  totalAmountExcludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Total amount including tax.' })
  totalAmountIncludingTax?: number;

  // Propriedades internas para os FieldResolvers ---
  supplierCode?: string;
}
