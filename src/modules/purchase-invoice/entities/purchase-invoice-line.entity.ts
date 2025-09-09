import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { ProductEntity } from '../../products/entities/product.entity';

@ObjectType('PurchaseInvoiceLine')
export class PurchaseInvoiceLineEntity {
  @Field(() => ID, { description: 'Unique identifier for the purchase invoice line.' })
  invoiceNumber!: string;

  @Field(() => Int, { nullable: true, description: 'Line number in the purchase invoice.' })
  lineNumber?: number;

  @Field(() => String, { nullable: true, description: 'Description of the product in the invoice line.' })
  productDescription?: string;

  @Field(() => Float, { nullable: true, description: 'Quantity of the product in the invoice line.' })
  quantity?: number;

  @Field(() => Float, { nullable: true, description: 'Gross price of the product in the invoice line.' })
  grossPrice?: number;

  @Field(() => Float, { nullable: true, description: 'Net price of the product in the invoice line.' })
  netPrice?: number;

  @Field(() => [String], { description: 'Consolidated tax codes for the line.' })
  taxCodes!: string[];

  // Relação com o produto, será carregada com FieldResolver
  @Field(() => ProductEntity, { nullable: true, description: 'The product associated with this invoice line.' })
  product?: ProductEntity;

  // Propriedade interna para o FieldResolver
  productCode?: string;
}
