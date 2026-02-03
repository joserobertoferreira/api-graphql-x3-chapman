import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { CommonDimensionEntity } from 'src/common/outputs/common-dimension.entity';
import { SalesOrderDimensionEntity } from 'src/common/outputs/sales-order-dimension.entity';
import { LineStatusGQL } from 'src/common/registers/enum-register';

@ObjectType('SalesOrderLine')
export class SalesOrderLineEntity {
  orderNumber: string;

  @Field(() => Int, { description: 'Order line' })
  lineNumber!: number;

  @Field(() => LineStatusGQL, { nullable: true, description: 'Status of the sales order line.' })
  lineStatus?: LineStatusGQL;

  @Field(() => String, { nullable: true, description: 'The product associated with this sales order line.' })
  product!: string;

  productCode: string;

  @Field({ nullable: true, description: 'The description of the product on this line.' })
  productDescription?: string;

  @Field(() => String, { nullable: true, description: 'Tax level applied to this line.' })
  taxLevel?: string;

  @Field(() => Float, { description: 'The quantity ordered in the sales unit.' })
  orderedQuantity: number;

  @Field(() => Float, { nullable: true, description: 'Net price excluding tax.' })
  netPriceExcludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Net price including tax.' })
  netPriceIncludingTax?: number;

  @Field(() => [SalesOrderDimensionEntity], {
    nullable: 'itemsAndList',
    description: 'Dimensions associated with this sales order line.',
  })
  dimensions?: SalesOrderDimensionEntity[];

  @Field(() => String, { nullable: true, description: 'Sales order line text' })
  orderLineText?: string;
}

@ObjectType('ClosedSalesOrderLine')
export class ClosedSalesOrderLineEntity {
  orderNumber: string;

  @Field(() => Int, { description: 'Order line' })
  lineNumber!: number;

  @Field(() => LineStatusGQL, { nullable: true, description: 'Status of the sales order line.' })
  lineStatus?: LineStatusGQL;

  @Field(() => CommonDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: CommonDimensionEntity;
}
