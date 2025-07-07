import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { ProductEntity } from '../../products/entities/product.entity';

@ObjectType('SalesOrderLine')
export class SalesOrderLineEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  lineNumber!: number;

  // --- Campos de SalesOrderLine (SORDERQ) ---
  @Field()
  requestedDeliveryDate!: Date;

  @Field()
  shipmentDate!: Date;

  @Field(() => Float, { description: 'The quantity ordered in the sales unit.' })
  orderedQuantity!: number;

  // --- Campos de SalesOrderPrice (SORDERP) ---
  @Field({ description: 'The description of the product on this line.' })
  description!: string;

  @Field(() => [String], { description: 'Tax levels applied to this line.' })
  taxLevels!: string[];

  @Field(() => Float)
  grossPrice!: number;

  @Field(() => Float)
  netPrice!: number;

  // --- Relação com Produto ---
  @Field(() => ProductEntity)
  product?: ProductEntity;
}
