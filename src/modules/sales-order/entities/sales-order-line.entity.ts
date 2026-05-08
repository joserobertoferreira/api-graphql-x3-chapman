import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { CommonDimensionEntity } from 'src/common/outputs/common-dimension.entity';
import { SalesOrderDimensionEntity } from 'src/common/outputs/sales-order-dimension.entity';
import { LineStatusGQL, OrderAccountingStatusGQL } from 'src/common/registers/enum-register';

@ObjectType('SalesOrderLine')
export class SalesOrderLineEntity {
  orderNumber: string;

  @Field(() => Int, { description: 'Order line' })
  lineNumber!: number;

  @Field(() => LineStatusGQL, { nullable: true, description: 'Status of the sales order line.' })
  lineStatus?: LineStatusGQL;

  @Field(() => OrderAccountingStatusGQL, { nullable: true, description: 'Accounting Status of the sales order line.' })
  accountingStatus?: OrderAccountingStatusGQL;

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

  @Field(() => GraphQLDate, { nullable: true, description: 'Service start date' })
  startDate?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Service end date' })
  endDate?: Date;
}

@ObjectType('ClosedSalesOrderLine')
export class ClosedSalesOrderLineEntity {
  orderNumber: string;

  @Field(() => Int, { description: 'Order line' })
  lineNumber!: number;

  @Field(() => LineStatusGQL, { nullable: true, description: 'Status of the sales order line.' })
  lineStatus?: LineStatusGQL;

  @Field(() => OrderAccountingStatusGQL, { nullable: true, description: 'Accounting Status of the sales order line.' })
  accountingStatus?: OrderAccountingStatusGQL;

  @Field(() => CommonDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: CommonDimensionEntity;
}
