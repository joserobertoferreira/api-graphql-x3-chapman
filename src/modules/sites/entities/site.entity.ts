import { Field, ObjectType } from '@nestjs/graphql';
import { AddressEntity } from '../../addresses/entities/address.entity';

@ObjectType({ description: 'Represent a company site' })
export class SiteEntity {
  @Field(() => String, { description: 'Unique code for the site' })
  siteCode!: string;

  @Field(() => String, { description: 'Site extended name' })
  siteName!: string;

  @Field(() => String, { nullable: true, description: 'Short title for the site' })
  shortTitle?: string;

  @Field(() => String, { nullable: true, description: 'Legal company code' })
  legalCompany?: string;

  @Field(() => String, { nullable: true, description: 'Site Tax Id Number' })
  siteTaxIdNumber?: string;

  @Field(() => [AddressEntity], {
    nullable: 'itemsAndList',
    description: 'List of addresses associated with the site',
  })
  addresses?: AddressEntity[];
}
