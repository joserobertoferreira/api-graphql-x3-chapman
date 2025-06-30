import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AddressEntity } from './address.entity';

@ObjectType({ description: 'Represents a customer in the system' })
export class CustomerEntity {
  @Field(() => String, { description: 'Customer code' })
  customerCode!: string;

  @Field(() => String, { nullable: true })
  customerName?: string;

  @Field(() => String, { nullable: true })
  shortName?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => Int, { nullable: true })
  isActive?: number;

  @Field(() => String, { nullable: true })
  customerCurrency?: string;

  @Field(() => String, { nullable: true, description: 'Customer default address code' })
  defaultAddressCode?: string;

  @Field(() => String, { nullable: true, description: 'VAT Number' })
  europeanUnionVatNumber?: string;

  @Field(() => [AddressEntity], { nullable: 'itemsAndList' })
  addresses?: AddressEntity[];
}
