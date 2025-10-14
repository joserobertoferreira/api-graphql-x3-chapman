import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { PurchaseOrderDimensionEntity } from '../../../common/outputs/purchase-order-dimension.entity';
import { LineStatusGQL } from '../../../common/registers/enum-register';

@ObjectType('PurchaseOrderLine')
export class PurchaseOrderLineEntity {
  orderNumber: string;

  @Field(() => Int, { description: 'Order line' })
  lineNumber!: number;

  @Field(() => LineStatusGQL, { nullable: true, description: 'Status of the purchase order line.' })
  lineStatus?: LineStatusGQL;

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

  @Field(() => [PurchaseOrderDimensionEntity], {
    nullable: 'itemsAndList',
    description: 'Dimensions associated with this Purchase order line.',
  })
  dimensions?: PurchaseOrderDimensionEntity[];
}
