import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { DimensionEntity } from '../../dimensions/entities/dimension.entity';

@ObjectType('PurchaseOrderLine')
export class PurchaseOrderLineEntity {
  orderNumber: string;

  @Field(() => Int, { description: 'Order line' })
  lineNumber!: number;

  @Field(() => Int, { nullable: true, description: 'Status of the purchase order line.' })
  lineStatus?: number;

  @Field(() => String, { nullable: true, description: 'The product associated with this purchase order line.' })
  product!: string;

  productCode: string;

  @Field({ nullable: true, description: 'The description of the product on this line.' })
  productDescription?: string;

  @Field(() => String, { nullable: true, description: 'Tax level applied to this line.' })
  taxLevel?: string;

  @Field(() => Float, { description: 'The quantity ordered in the Purchase unit.' })
  orderedQuantity: number;

  @Field(() => Float, { description: 'Gross price of the product in the Purchase unit.' })
  grossPrice: number;

  // @Field(() => Float, { nullable: true, description: 'Net price excluding tax.' })
  // netPriceExcludingTax?: number;

  // @Field(() => Float, { nullable: true, description: 'Net price including tax.' })
  // netPriceIncludingTax?: number;

  @Field(() => [DimensionEntity], {
    nullable: 'itemsAndList',
    description: 'Dimensions associated with this Purchase order line.',
  })
  dimensions?: DimensionEntity[];
}
