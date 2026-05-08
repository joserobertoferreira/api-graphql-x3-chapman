import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { InvoiceStatusGQL, OrderAccountingStatusGQL, OrderStatusGQL } from 'src/common/registers/enum-register';
import { SalesOrderLastInvoiceInfo } from './sales-order-invoice.info.entity';

@ObjectType('SalesOrderStatus')
export class SalesOrderStatusEntity {
  @Field(() => ID, { description: 'The unique sales order number' })
  orderNumber!: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Sales order date' })
  orderDate?: Date;

  @Field(() => OrderStatusGQL, { description: 'Sales order status' })
  orderStatus!: OrderStatusGQL;

  @Field(() => InvoiceStatusGQL, {
    nullable: true,
    description: 'The invoicing status of the order (e.g., Not Invoiced, Partially, Fully).',
  })
  invoicedStatus?: InvoiceStatusGQL;

  @Field(() => OrderAccountingStatusGQL, { nullable: true, description: 'Accounting Status of the sales order line.' })
  accountingStatus?: OrderAccountingStatusGQL;

  @Field(() => SalesOrderLastInvoiceInfo, {
    nullable: true,
    description: 'Information about the last invoice associated with this order.',
  })
  lastSalesInvoice?: SalesOrderLastInvoiceInfo;

  @Field(() => GraphQLDate, { nullable: true, description: 'The date of the last invoice.' })
  lastSalesInvoiceDate?: Date;
}
