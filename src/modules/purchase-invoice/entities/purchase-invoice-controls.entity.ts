import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { CurrencyRateEntity } from '../../currency-rate/entities/currency-rate.entity';

@ObjectType('PurchaseInvoiceSourceInfo')
export class PurchaseInvoiceSourceInfoEntity {
  @Field(() => GraphQLDate, { nullable: true, description: 'The date from the original supplier document.' })
  sourceDocumentDate?: Date;

  @Field(() => String, { nullable: true, description: 'The number of the original supplier document.' })
  sourceDocument?: string;

  @Field(() => String, { nullable: true, description: 'Pay to business partner code.' })
  payToBusinessPartner?: string;

  @Field(() => String, { nullable: true, description: 'The currency of the invoice.' })
  currency?: string;

  @Field(() => CurrencyRateEntity, { nullable: true, description: 'Currency rate information.' })
  currencyRate?: CurrencyRateEntity;

  @Field(() => String, { nullable: true, description: 'The original invoice number.' })
  originalInvoiceNumber!: string;
}

@ObjectType('PurchaseInvoicePaymentInfo')
export class PurchaseInvoicePaymentInfoEntity {
  @Field(() => String, { nullable: true, description: 'The internal reference for payment.' })
  internalReference?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'The due date basis for payment.' })
  dueDateCalculationStartDate?: Date;

  @Field(() => String, { nullable: true, description: 'The payment term code.' })
  paymentTerm?: string;

  @Field(() => String, { nullable: true, description: 'The settlement discount code.' })
  settlementDiscount?: string;

  @Field(() => String, { nullable: true, description: 'Tax rule code.' })
  taxRule?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Start service date.' })
  serviceStartDate?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'End service date.' })
  serviceEndDate?: Date;

  @Field(() => String, { nullable: true, description: 'VCS Number.' })
  vcsNumber?: string;
}

@ObjectType('PurchaseInvoiceCommentsInfo')
export class PurchaseInvoiceCommentsInfoEntity {
  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of invoice comments text.' })
  commentText?: string[];
}

@ObjectType('PurchaseInvoiceAmountInfo')
export class PurchaseInvoiceAmountInfoEntity {
  @Field(() => Number, { nullable: true, description: 'Invoice lines amount excluding tax.' })
  invoiceLinesExcludingTax?: number;

  @Field(() => Number, { nullable: true, description: 'Invoice Tax.' })
  invoiceTotalTaxAmount?: number;

  @Field(() => Number, { nullable: true, description: 'Invoice total.' })
  invoiceTotalAmount?: number;

  @Field(() => String, { nullable: true, description: 'Invoice status.' })
  status?: string;

  @Field(() => String, { nullable: true, description: 'Matching status.' })
  matchStatus?: string;
}

@ObjectType('PurchaseInvoiceControls')
export class PurchaseInvoiceControlsEntity {
  @Field(() => PurchaseInvoiceSourceInfoEntity)
  sourceInfo!: PurchaseInvoiceSourceInfoEntity;

  @Field(() => PurchaseInvoicePaymentInfoEntity)
  paymentInfo!: PurchaseInvoicePaymentInfoEntity;

  @Field(() => PurchaseInvoiceCommentsInfoEntity)
  commentsInfo!: PurchaseInvoiceCommentsInfoEntity;

  @Field(() => PurchaseInvoiceAmountInfoEntity)
  amountInfo!: PurchaseInvoiceAmountInfoEntity;
}
