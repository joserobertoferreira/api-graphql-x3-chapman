import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
// import { SalesOrderLine } from './sales-order-line-types';
// import { SalesOrderPrice } from './sales-order-price-types';

@ObjectType('Product', { description: 'Product entity representing a product in the system' })
export class ProductEntity {
  @Field(() => ID, { nullable: false, description: 'Unique identifier for the product' })
  code!: string;

  @Field(() => String, { nullable: false, description: 'Category of the product' })
  productCategory!: string;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of product description' })
  descriptions: string[];

  @Field(() => String, { nullable: false })
  salesUnit!: string;

  @Field(() => String, { nullable: false })
  purchaseUnit?: string;

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of product tax level' })
  taxesLevel: string[];

  @Field(() => [String], { nullable: 'itemsAndList', description: 'List of product statistical group' })
  productStatisticalGroup: string[];

  @Field(() => Float, { nullable: true, description: 'Base price of the product' })
  basePrice?: number;

  // salesOrderLines?: SalesOrderLine[];

  // salesOrderPrices?: SalesOrderPrice[];
}
