import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { CommonDimensionEntity } from '../../../common/outputs/common-dimension.entity';
import { LedgerTypeGQL, SignByDefaultGQL } from '../../../common/registers/enum-register';

@ObjectType('SupplierInvoiceAnalyticalLine')
export class SupplierInvoiceAnalyticalLineEntity {
  @Field(() => Int, { description: 'Line number of the analytical line.' })
  lineNumber: number;

  @Field(() => LedgerTypeGQL, { nullable: true, description: 'Ledger type.' })
  ledgerTypeNumber?: LedgerTypeGQL;

  @Field(() => Int, { nullable: true, description: 'Analytical line number.' })
  analyticalLineNumber?: number;

  @Field(() => String, { nullable: true, description: 'Site code.' })
  site?: string;

  @Field(() => CommonDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: CommonDimensionEntity;

  @Field(() => Float, { nullable: true, description: 'Analytical line amount.' })
  amount?: number;
}

@ObjectType('SupplierInvoiceLine')
export class SupplierInvoiceLineEntity {
  @Field(() => Int, { nullable: true, description: 'Line number of line.' })
  lineNumber?: number;

  @Field(() => String, { nullable: true, description: 'Site code.' })
  site?: string;

  @Field(() => String, { nullable: true, description: 'Company code.' })
  company?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date.' })
  accountingDate?: Date;

  @Field(() => String, { nullable: true, description: 'Account.' })
  account?: string;

  @Field(() => String, { nullable: true, description: 'Business partner code.' })
  businessPartner?: string;

  @Field(() => String, { nullable: true, description: 'Plan account code.' })
  chartOfAccount?: string;

  @Field(() => String, { nullable: true, description: 'Control account code.' })
  controlAccount?: string;

  @Field(() => SignByDefaultGQL, { nullable: true, description: 'Debit or credit indicator.' })
  debitOrCredit?: SignByDefaultGQL;

  @Field(() => Float, { nullable: true, description: 'Line amount excluding tax.' })
  lineAmount?: number;

  @Field(() => Float, { nullable: true, description: 'Quantity in the journal entry.' })
  quantity?: number;

  @Field(() => String, { nullable: true, description: 'Line comment.' })
  comment?: string;

  @Field(() => String, { nullable: true, description: 'Tax code.' })
  taxCode?: string;

  @Field(() => [SupplierInvoiceAnalyticalLineEntity], { nullable: 'itemsAndList', description: 'Analytical lines.' })
  analyticalLines?: SupplierInvoiceAnalyticalLineEntity[];

  // Propriedade interna para o FieldResolver de analyticalLines ---
  document?: string;
}
