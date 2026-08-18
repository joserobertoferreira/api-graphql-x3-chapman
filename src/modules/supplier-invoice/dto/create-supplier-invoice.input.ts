import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { GraphQLDate } from 'graphql-scalars';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { PaymentApprovalTypeGQL } from '../../../common/registers/enum-register';
import { PaymentApprovalTypeInputScalar } from '../../../common/utils/scalars.utils';

@InputType()
export class SupplierInvoiceLineInput {
  @Field(() => ID, { description: 'The general ledger account code.' })
  @IsNotEmpty()
  @IsString()
  account: string;

  @Field(() => ID, { nullable: true, description: 'The business partner code.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  businessPartner?: string;

  @Field(() => Float, { description: 'The amount for this line.' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @Field(() => String, { nullable: true, description: 'Comment for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  comment?: string;

  @Field(() => String, { nullable: true, description: 'Tax code for this specific line.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  taxCode?: string;

  @Field(() => DimensionsInput, {
    nullable: true,
    description: 'Supplier invoice entry dimensions for this specific line.',
  })
  @IsOptional()
  dimensions?: DimensionsInput;
}

@InputType({ description: 'Data to create a Supplier invoice, include header and lines' })
export class CreateSupplierInvoiceInput {
  @Field(() => String, { description: 'The site associated with the invoice.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  site: string;

  @Field(() => String, { description: 'The invoice Type.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  invoiceType: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'The date of the invoice.' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  accountingDate?: Date;

  @Field(() => String, { nullable: true, description: 'The collective assigned to the invoice.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, collective cannot be empty.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  collective?: string;

  @Field(() => String, { description: 'The supplier code associated with the invoice.' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  supplier: string;

  @Field(() => String, { nullable: true, description: 'Pay to code.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, pay to code cannot be empty.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  payToBusinessPartner?: string;

  @Field(() => String, { description: 'Tax rule code.' })
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  taxRule!: string;

  @Field(() => String, { nullable: true, description: 'Source document number.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, source document cannot be empty.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  sourceDocument?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Source document date.' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  sourceDocumentDate?: Date;

  @Field(() => String, { nullable: true, description: 'Invoice currency.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, currency cannot be empty.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  currency?: string;

  @Field(() => String, { nullable: true, description: 'Original invoice number.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'If provided, invoice number cannot be empty.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  originalInvoiceNumber?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Due date basis.' })
  @IsOptional()
  @IsDate()
  @IsNotEmpty()
  dueDateCalculationStartDate?: Date;

  @Field(() => PaymentApprovalTypeInputScalar, { nullable: true, description: 'Payment approval type' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsEnum(PaymentApprovalTypeGQL, { message: 'If provided, paymentApproval must be a valid enum value.' })
  paymentApproval?: PaymentApprovalTypeGQL;

  @Field(() => [SupplierInvoiceLineInput], { description: 'An array with all invoice lines.' })
  @IsArray()
  @ValidateNested({ each: true }) // Ensure each item in the array is validated
  @ArrayMinSize(1, { message: 'At least one line item is required.' })
  @Type(() => SupplierInvoiceLineInput)
  lines: SupplierInvoiceLineInput[];

  // Propriedades internas para os FieldResolvers ---
  supplierCode?: string;
}
