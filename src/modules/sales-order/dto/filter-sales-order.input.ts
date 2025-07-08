import { Field, InputType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';

@InputType()
export class SalesOrderFilterInput {
  @Field(() => [String], { nullable: true, description: 'Filter by one or more order IDs.' })
  orderId_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter by one or more customer codes.' })
  customerCode_in?: string[];

  @Field(() => [String], { nullable: true, description: 'Filter by one or more sales sites.' })
  salesSite_in?: string[];

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders created on or after this date.' })
  orderDate_gte?: Date; // gte = Greater Than or Equal

  @Field(() => GraphQLDate, { nullable: true, description: 'Find orders created on or before this date.' })
  orderDate_lte?: Date; // lte = Less Than or Equal
}
