import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { OrderStatusGQL } from '../../../common/registers/enum-register';

@ObjectType('SalesOrderText')
export class SalesOrderTextEntity {
  @Field(() => ID, { description: 'The unique sales order number' })
  orderNumber!: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Sales order date' })
  orderDate?: Date;

  @Field(() => OrderStatusGQL, { nullable: true, description: 'Sales order status' })
  status?: OrderStatusGQL;

  @Field(() => String, { nullable: true, description: 'Sales order header text' })
  orderHeaderText?: string;

  @Field(() => String, { nullable: true, description: 'Sales order footer text' })
  orderFooterText?: string;

  @Field(() => [SalesOrderLineTextEntity], {
    nullable: 'itemsAndList',
    description: 'List of sales order line texts',
  })
  lineTexts?: SalesOrderLineTextEntity[];
}

@ObjectType('SalesOrderLineText')
export class SalesOrderLineTextEntity {
  @Field(() => Number, { description: 'Sales order line number' })
  lineNumber: number;

  @Field(() => String, { nullable: true, description: 'Sales order line text' })
  orderLineText: string;
}
