import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SalesOrderSoldToCustomerInfo')
export class SalesOrderSoldToCustomerInfo {
  @Field(() => String, { nullable: true, description: 'Sold-to-customer code.' })
  soldToCustomerCode?: string;

  @Field(() => [String], { nullable: true, description: 'Sold-to-customer name.' })
  soldToCustomerName?: string[];

  @Field(() => String, { nullable: true, description: 'Sold-to-customer address code.' })
  soldToCustomerAddress?: string;

  @Field(() => [String], { nullable: true, description: 'Sold-to-customer address lines.' })
  soldAddressLines?: string[];

  @Field(() => String, { nullable: true, description: 'Sold-to-customer postal code.' })
  soldToCustomerPostalCode?: string;

  @Field(() => String, { nullable: true, description: 'Sold-to-customer city.' })
  soldToCustomerCity?: string;

  @Field(() => String, { nullable: true, description: 'Sold-to-customer state.' })
  soldToCustomerState?: string;

  @Field(() => String, { nullable: true, description: 'Sold-to-customer country code.' })
  soldToCustomerCountry?: string;

  @Field(() => String, { nullable: true, description: 'Sold-to-customer country name.' })
  soldToCustomerCountryName?: string;

  // @Field(() => String, { nullable: true, description: 'Sold-to-customer European Union VAT number.' })
  // soldToCustomerEuropeanUnionVatNumber?: string;
}
