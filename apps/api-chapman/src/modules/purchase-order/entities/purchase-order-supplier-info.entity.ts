import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PurchaseOrderSupplierInfo')
export class PurchaseOrderSupplierInfo {
  @Field(() => String, { nullable: true, description: 'Supplier code.' })
  supplier?: string;

  @Field(() => [String], { nullable: true, description: 'Supplier name.' })
  supplierNames?: string[];

  @Field(() => String, { nullable: true, description: 'Supplier address code.' })
  supplierAddress?: string;

  @Field(() => [String], { nullable: true, description: 'Supplier address lines.' })
  supplierAddressLines?: string[];

  @Field(() => String, { nullable: true, description: 'Supplier postal code.' })
  supplierPostalCode?: string;

  @Field(() => String, { nullable: true, description: 'Supplier city.' })
  supplierCity?: string;

  // @Field(() => String, { nullable: true, description: 'Supplier state.' })
  // supplierState?: string;

  @Field(() => String, { nullable: true, description: 'Supplier country code.' })
  supplierCountry?: string;

  @Field(() => String, { nullable: true, description: 'Supplier country name.' })
  supplierCountryName?: string;

  @Field(() => String, { nullable: true, description: 'Supplier VAT number.' })
  supplierVatNumber?: string;
}
