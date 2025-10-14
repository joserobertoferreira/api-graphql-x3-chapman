import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { OrderStatusGQL } from '../../../common/registers/enum-register';
import { SalesOrderLineEntity } from './sales-order-line.entity';
import { SalesOrderSoldToCustomerInfo } from './sales-order-soldToCustomer-info.entity';

@ObjectType('SalesOrder')
export class SalesOrderEntity {
  @Field(() => ID, { description: 'The unique sales order number' })
  orderNumber!: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Sales order date' })
  orderDate?: Date;

  @Field(() => OrderStatusGQL, { nullable: true, description: 'Sales order status' })
  status?: OrderStatusGQL;

  @Field({ nullable: true, description: 'Currency code of the sales order' })
  currency?: string;

  // @Field(() => Int, { nullable: true, description: 'Currency rate type' })
  // currencyRateType?: number;

  @Field(() => Float, { nullable: true, description: 'Currency rate of the sales order' })
  currencyRate?: number;

  @Field(() => String, { nullable: true, description: 'Company' })
  company?: string;

  @Field(() => String, { nullable: true, description: 'Shipping site' })
  shippingSite?: string;

  // @Field(() => String, { nullable: true, description: 'Taxe rule' })
  // taxRule?: string;

  @Field(() => Float, { nullable: true, description: 'Total amount of the order, excluding taxes' })
  totalAmountExcludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Total amount of the order, including taxes' })
  totalAmountIncludingTax?: number;

  @Field(() => SalesOrderSoldToCustomerInfo, { nullable: true, description: 'Information about the sold-to customer' })
  soldTo?: SalesOrderSoldToCustomerInfo;

  // @Field(() => SalesOrderBillToCustomerInfo, { nullable: true, description: 'Information about the bill-to customer' })
  // billTo?: SalesOrderBillToCustomerInfo;

  // @Field(() => SalesOrderShipToCustomerInfo, { nullable: true, description: 'Information about the ship-to customer' })
  // shipTo?: SalesOrderShipToCustomerInfo;

  @Field(() => [SalesOrderLineEntity], { nullable: 'itemsAndList', description: 'The lines of the sales order' })
  lines?: SalesOrderLineEntity[];
}
