import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { PurchaseOrderLineEntity } from './purchase-order-line.entity';
import { PurchaseOrderSupplierInfo } from './purchase-order-supplier-info.entity';

@ObjectType('PurchaseOrder')
export class PurchaseOrderEntity {
  @Field(() => ID, { description: 'The unique purchase order number' })
  orderNumber!: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Purchase order date' })
  orderDate?: Date;

  // @Field(() => Int, { nullable: true, description: 'Purchase order status' })
  // status?: number;

  @Field({ nullable: true, description: 'Currency code of the purchase order' })
  currency?: string;

  // @Field(() => Int, { nullable: true, description: 'Currency rate type' })
  // currencyRateType?: number;

  @Field(() => Float, { nullable: true, description: 'Currency rate of the purchase order' })
  currencyRate?: number;

  @Field(() => String, { nullable: true, description: 'Company' })
  company?: string;

  @Field(() => String, { nullable: true, description: 'Purchasing site' })
  purchasingSite?: string;

  // @Field(() => String, { nullable: true, description: 'Taxe rule' })
  // taxRule?: string;

  @Field(() => Float, { nullable: true, description: 'Total amount of the order, excluding taxes' })
  totalAmountExcludingTax?: number;

  @Field(() => Float, { nullable: true, description: 'Total amount of the order, including taxes' })
  totalAmountIncludingTax?: number;

  @Field(() => PurchaseOrderSupplierInfo, {
    nullable: true,
    description: 'Information about the supplier',
  })
  supplierInfo?: PurchaseOrderSupplierInfo;

  @Field(() => [PurchaseOrderLineEntity], { nullable: 'itemsAndList', description: 'The lines of the purchase order' })
  lines?: PurchaseOrderLineEntity[];
}
