import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SalesOrderBillToCustomerInfo')
export class SalesOrderBillToCustomerInfo {
  @Field(() => String, { nullable: true, description: 'Bill-to-customer code.' })
  billToCustomerCode?: string;

  @Field(() => [String], { nullable: true, description: 'Bill-to-customer name.' })
  billToCustomerName?: string[];

  @Field(() => String, { nullable: true, description: 'Bill-to-customer address code.' })
  billToCustomerAddress?: string;

  @Field(() => [String], { nullable: true, description: 'Bill-to-customer address lines.' })
  billAddressLines?: string[];

  @Field(() => String, { nullable: true, description: 'Bill-to-customer postal code.' })
  billToCustomerPostalCode?: string;

  @Field(() => String, { nullable: true, description: 'Bill-to-customer city.' })
  billToCustomerCity?: string;

  @Field(() => String, { nullable: true, description: 'Bill-to-customer state.' })
  billToCustomerState?: string;

  @Field(() => String, { nullable: true, description: 'Bill-to-customer country code.' })
  billToCustomerCountry?: string;

  @Field(() => String, { nullable: true, description: 'Bill-to-customer country name.' })
  billToCustomerCountryName?: string;

  @Field(() => String, { nullable: true, description: 'Bill-to-customer European Union VAT number.' })
  billToCustomerEuropeanUnionVatNumber?: string;
}
