import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SalesOrderShipToCustomerInfo')
export class SalesOrderShipToCustomerInfo {
  @Field(() => String, { nullable: true, description: 'Ship-to-customer code.' })
  shipToCustomerCode?: string;

  @Field(() => [String], { nullable: true, description: 'Ship-to-customer name.' })
  shipToCustomerName?: string[];

  @Field(() => String, { nullable: true, description: 'Ship-to-customer address code.' })
  shipToCustomerAddress?: string;

  @Field(() => [String], { nullable: true, description: 'Ship-to-customer address lines.' })
  shipAddressLines?: string[];

  @Field(() => String, { nullable: true, description: 'Ship-to-customer postal code.' })
  shipToCustomerPostalCode?: string;

  @Field(() => String, { nullable: true, description: 'Ship-to-customer city.' })
  shipToCustomerCity?: string;

  @Field(() => String, { nullable: true, description: 'Ship-to-customer state.' })
  shipToCustomerState?: string;

  @Field(() => String, { nullable: true, description: 'Ship-to-customer country code.' })
  shipToCustomerCountry?: string;

  @Field(() => String, { nullable: true, description: 'Ship-to-customer country name.' })
  shipToCustomerCountryName?: string;

  @Field(() => String, { nullable: true, description: 'Ship-to-customer European Union VAT number.' })
  shipToCustomerEuropeanUnionVatNumber?: string;
}
