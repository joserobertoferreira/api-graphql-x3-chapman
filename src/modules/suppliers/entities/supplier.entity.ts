import { Field, ObjectType } from '@nestjs/graphql';
import { AddressEntity } from '../../addresses/entities/address.entity';

@ObjectType({ description: 'Represents a supplier in the system' })
export class SupplierEntity {
  @Field(() => String, { description: 'Supplier code' })
  supplierCode!: string;

  @Field(() => String, { nullable: true })
  supplierName?: string;

  @Field(() => String, { nullable: true })
  shortName?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => String, { nullable: true })
  supplierCurrency?: string;

  @Field(() => String, { nullable: true, description: 'Supplier default address code' })
  defaultAddressCode?: string;

  @Field(() => String, { nullable: true, description: 'VAT Number' })
  europeanUnionVatNumber?: string;

  @Field(() => [AddressEntity], { nullable: 'itemsAndList' })
  addresses?: AddressEntity[];
}
