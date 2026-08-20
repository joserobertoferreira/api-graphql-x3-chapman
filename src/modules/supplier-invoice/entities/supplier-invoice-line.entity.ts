import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { CommonDimensionEntity } from '../../../common/outputs/common-dimension.entity';

@ObjectType('SupplierInvoiceAnalyticalLine')
export class SupplierInvoiceAnalyticalLineEntity {
  @Field(() => Int, { description: 'Line number of the analytical line.' })
  lineNumber: number;

  @Field(() => Int, { nullable: true, description: 'Analytical line number.' })
  analyticalLineNumber?: number;

  @Field(() => CommonDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: CommonDimensionEntity;
}

@ObjectType('SupplierInvoiceLine')
export class SupplierInvoiceLineEntity {
  @Field(() => Int, { nullable: true, description: 'Line number of line.' })
  lineNumber?: number;

  @Field(() => String, { nullable: true, description: 'Site code.' })
  site?: string;

  @Field(() => String, { nullable: true, description: 'The collective assigned to the invoice line.' })
  collective?: string;

  @Field(() => String, { nullable: true, description: 'Account.' })
  account?: string;

  @Field(() => String, { nullable: true, description: 'Business partner code.' })
  businessPartner?: string;

  @Field(() => Float, { nullable: true, description: 'Line amount excluding tax.' })
  lineAmountExcludingTax?: number;

  @Field(() => String, { nullable: true, description: 'Tax code.' })
  taxCode?: string;

  @Field(() => Float, { nullable: true, description: 'Tax amount.' })
  taxAmount?: number;

  @Field(() => Float, { nullable: true, description: 'Deductible Tax.' })
  deductableTax?: number;

  @Field(() => Float, { nullable: true, description: 'Line amount including tax.' })
  lineAmountIncludingTax?: number;

  @Field(() => String, { nullable: true, description: 'Line comment.' })
  comment?: string;

  @Field(() => [SupplierInvoiceAnalyticalLineEntity], { nullable: 'itemsAndList', description: 'Analytical lines.' })
  analyticalLines?: SupplierInvoiceAnalyticalLineEntity[];

  // Propriedade interna para o FieldResolver de analyticalLines ---
  document?: string;
}
