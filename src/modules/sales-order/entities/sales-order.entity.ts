import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { Int } from 'type-graphql';
import { SalesOrderBillToCustomerInfo } from './sales-order-billToCustomer-info.entity';
import { SalesOrderLineEntity } from './sales-order-line.entity';
import { SalesOrderShipToCustomerInfo } from './sales-order-shipToCustomer-info.entity';
import { SalesOrderSoldToCustomerInfo } from './sales-order-soldToCustomer-info.entity';

@ObjectType('SalesOrder')
export class SalesOrderEntity {
  @Field(() => ID, { description: 'The unique sales order number' })
  id!: string;

  @Field(() => String, { description: 'Sales site' })
  salesSite!: string;

  @Field({ description: 'Sales order date' })
  orderDate!: Date;

  @Field({ nullable: true, description: 'Sales order shipping date' })
  shippingDate?: Date;

  @Field({ nullable: true, description: 'Sales order requested delivery date' })
  requestedDeliveryDate?: Date;

  @Field({ nullable: true, description: 'Sales order customer reference' })
  customerOrderReference?: string;

  @Field(() => String, { description: 'Currency code of the sales order' })
  currency!: string;

  @Field(() => Int, { nullable: true, description: 'Currency rate type' })
  currencyRateType?: number;

  @Field(() => Float, { nullable: true, description: 'Currency rate of the sales order' })
  currencyRate?: number;

  @Field(() => String, { nullable: true, description: 'Taxe rule' })
  taxRule?: string;

  @Field(() => Float, { description: 'Total amount of the order, excluding taxes' })
  totalAmountExcludingTax!: number;

  @Field(() => Float, { description: 'Total amount of the order, including taxes' })
  totalAmountIncludingTax!: number;

  @Field(() => SalesOrderSoldToCustomerInfo, { nullable: true, description: 'Information about the sold-to customer' })
  soldTo?: SalesOrderSoldToCustomerInfo;

  @Field(() => SalesOrderBillToCustomerInfo, { nullable: true, description: 'Information about the bill-to customer' })
  billTo?: SalesOrderBillToCustomerInfo;

  @Field(() => SalesOrderShipToCustomerInfo, { nullable: true, description: 'Information about the ship-to customer' })
  shipTo?: SalesOrderShipToCustomerInfo;

  @Field(() => [SalesOrderLineEntity], { description: 'The lines of the sales order' })
  lines?: SalesOrderLineEntity[];
}
