import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import {
  CommonBusinessPartnerNameEntity,
  CommonDimensionEntity,
} from '../../../common/outputs/common-dimension.entity';

@ObjectType('CustomPurchaseInvoiceLine')
export class CustomPurchaseInvoiceLineEntity {
  @Field(() => Int, { nullable: true, description: 'Line number in the purchase invoice.' })
  lineNumber?: number;

  @Field(() => String, { nullable: true, description: 'The product associated with the line.' })
  productCode?: string;

  @Field(() => String, { nullable: true, description: 'The description of the product.' })
  description?: string;

  @Field(() => Float, { nullable: true, description: 'Quantity of the product.' })
  quantity?: number;

  @Field(() => Float, { nullable: true, description: 'Gross price of the product.' })
  grossPrice?: number;

  @Field(() => Float, { nullable: true, description: 'Line amount excluding tax.' })
  lineAmountExcludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Line tax amount.' })
  lineTaxAmount?: number;

  @Field(() => Float, { nullable: true, description: 'Line amount including tax.' })
  lineAmountIncludingTax?: number;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Fixture dimension detail.' })
  fixture?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Broker dimension detail.' })
  broker?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Department dimension detail.' })
  department?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Location dimension detail.' })
  location?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Type dimension detail.' })
  type?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Product dimension detail.' })
  product?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Analysis dimension detail.' })
  analysis?: CommonDimensionEntity;
}

@ObjectType('CustomPurchaseInvoice')
export class CustomPurchaseInvoiceEntity {
  @Field(() => String, { nullable: true, description: 'The site associated with the invoice.' })
  site?: string;

  @Field(() => String, { nullable: true, description: 'The company associated with the invoice.' })
  company?: string;

  @Field(() => ID, { description: 'Unique identifier for the purchase invoice.' })
  invoiceNumber!: string;

  @Field(() => String, { nullable: true, description: 'The invoice Type.' })
  invoiceType?: string;

  @Field(() => String, { nullable: true, description: 'The purchase invoice category.' })
  category?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'The date of the invoice.' })
  accountingDate?: Date;

  // @Field(() => Boolean, { nullable: true, description: 'Flag for Intercompany.' })
  // isIntercompany?: boolean;

  @Field(() => CommonBusinessPartnerNameEntity, {
    nullable: true,
    description: 'The supplier code associated with the invoice.',
  })
  billBySupplier?: CommonBusinessPartnerNameEntity;

  supplier?: string;

  @Field(() => String, { nullable: true, description: 'The source document number.' })
  sourceDocument?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'The source document date.' })
  sourceDocumentDate?: Date;

  @Field(() => String, { nullable: true, description: 'Internal reference for the invoice.' })
  internalReference?: string;

  @Field(() => String, { nullable: true, description: 'Invoice currency.' })
  currency?: string;

  @Field(() => String, { nullable: true, description: 'Company currency.' })
  companyCurrency?: string;

  @Field(() => Float, { nullable: true, description: 'Total amount excluding tax.' })
  totalAmountExcludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Total amount excluding tax in company currency.' })
  totalAmountExcludingTaxInCompanyCurrency?: number;

  @Field(() => Float, { nullable: true, description: 'Total amount including tax.' })
  totalAmountIncludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Total amount including tax in company currency.' })
  totalAmountIncludingTaxInCompanyCurrency?: number;

  @Field(() => Float, { nullable: true, description: 'Total tax amount.' })
  taxAmount?: number;

  @Field(() => [CustomPurchaseInvoiceLineEntity], {
    nullable: 'itemsAndList',
    description: 'The lines of the purchase invoice',
  })
  lines?: CustomPurchaseInvoiceLineEntity[];
}
