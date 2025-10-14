import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { PurchaseInvoiceControlsEntity } from './purchase-invoice-controls.entity';
import { PurchaseInvoiceLineEntity } from './purchase-invoice-line.entity';

@ObjectType('PurchaseInvoice')
export class PurchaseInvoiceEntity {
  @Field(() => ID, { description: 'Unique identifier for the purchase invoice.' })
  invoiceNumber!: string;

  @Field(() => String, { nullable: true, description: 'The site associated with the invoice.' })
  invoiceSite?: string;

  @Field(() => String, { nullable: true, description: 'The invoice Type.' })
  invoiceType?: string;

  @Field(() => String, { nullable: true, description: 'The purchase invoice category.' })
  purchaseInvoiceCategory?: string;

  @Field(() => GraphQLDate, { description: 'The date of the invoice.' })
  accountingDate!: Date;

  @Field(() => Boolean, { nullable: true, description: 'Flag for Intercompany.' })
  isIntercompany?: boolean;

  @Field(() => String, { nullable: true, description: 'The supplier code associated with the invoice.' })
  supplier!: string;

  @Field(() => String, { nullable: true, description: 'The control associated with the invoice.' })
  control?: string;

  @Field(() => String, { nullable: true, description: 'The company name associated with the supplier.' })
  companyName?: string;

  @Field(() => String, { nullable: true, description: 'The payment approval for invoice.' })
  paymentApproval?: string;

  @Field(() => Boolean, { nullable: true, description: 'Indicates if the invoice is suspended.' })
  suspendedInvoice?: boolean;

  @Field(() => PurchaseInvoiceControlsEntity, {
    nullable: true,
    description: 'Control information from the supplier document.',
  })
  controlsInfo?: PurchaseInvoiceControlsEntity;

  // @Field(() => String, { description: 'The company associated with the invoice.' })
  // company!: string;

  @Field(() => Float, { description: 'Total amount excluding tax.' })
  totalAmountExcludingTax!: number;

  @Field(() => Float, { description: 'Total amount including tax.' })
  totalAmountIncludingTax!: number;

  // RELAÇÕES

  // Relação com as linhas (muitas)
  @Field(() => [PurchaseInvoiceLineEntity], { nullable: 'itemsAndList' })
  lines?: PurchaseInvoiceLineEntity[];

  // Propriedades internas para os FieldResolvers ---
  supplierCode?: string;
}

@ObjectType('PurchaseBillBySupplierInfo')
export class PurchaseBillBySupplierInfoEntity {
  @Field(() => String, { description: 'The bill by supplier code.' })
  billBySupplier!: string;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'The bill by supplier names.' })
  billBySupplierNames?: [string];

  @Field(() => String, { nullable: true, description: 'The language code for the bill by supplier.' })
  billBySupplierLanguage?: string;

  @Field(() => [String], {
    nullable: 'itemsAndList',
    description: 'List of addresses associated with the bill by supplier.',
  })
  billBySupplierAddresses?: string[];

  @Field(() => String, { nullable: true, description: 'The bill to supplier city.' })
  billBySupplierCity?: string;

  @Field(() => String, { nullable: true, description: 'The bill to supplier country.' })
  billBySupplierCountry?: string;

  @Field(() => String, { nullable: true, description: 'The bill to supplier country name.' })
  billBySupplierCountryName?: string;

  @Field(() => String, { nullable: true, description: 'The bill to supplier postal code.' })
  billBySupplierPostalCode?: string;

  @Field(() => String, { nullable: true, description: 'The bill to supplier state.' })
  billBySupplierState?: string;
}
