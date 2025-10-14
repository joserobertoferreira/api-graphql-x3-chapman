import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { InvoiceStatusGQL, OrderStatusGQL } from '../../../common/registers/enum-register';
import { SalesOrderLastInvoiceInfo } from './sales-order-invoice.info.entity';

@ObjectType('SalesOrderStatus')
export class SalesOrderStatusEntity {
  @Field(() => ID, { description: 'The unique sales order number' })
  orderNumber!: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Sales order date' })
  orderDate?: Date;

  @Field(() => SalesOrderLastInvoiceInfo, {
    nullable: true,
    description: 'Information about the last invoice associated with this order.',
  })
  lastSalesInvoice?: SalesOrderLastInvoiceInfo;

  @Field(() => OrderStatusGQL, { description: 'Sales order status' })
  orderStatus!: OrderStatusGQL;

  @Field(() => InvoiceStatusGQL, {
    description: 'The invoicing status of the order (e.g., Not Invoiced, Partially, Fully).',
  })
  invoicedStatus!: InvoiceStatusGQL;

  @Field(() => GraphQLDate, { nullable: true, description: 'The date of the last invoice.' })
  lastSalesInvoiceDate?: Date;
}
