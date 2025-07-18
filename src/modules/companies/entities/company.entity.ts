import { Field, ObjectType } from '@nestjs/graphql';
import { AddressEntity } from '../../addresses/entities/address.entity';
// import { SiteEntity } from '../../sites/entities/site.entity';

@ObjectType({ description: 'Represent a company' })
export class CompanyEntity {
  @Field(() => String, { description: 'Unique code for the company' })
  company!: string;

  // @Field(() => String)
  // standardName!: string;

  @Field(() => String, { description: 'Company extended name' })
  companyName!: string;

  @Field(() => String, { nullable: true, description: 'Short title for the company' })
  shortTitle?: string;

  @Field(() => String, { nullable: true, description: 'Company legislation' })
  legislation?: string;

  // @Field(() => Boolean)
  // isLegalCompany?: boolean;

  @Field(() => String, { nullable: true, description: 'SIREN' })
  sirenNumber?: string;

  @Field(() => String, { nullable: true, description: 'Unique identification number' })
  uniqueIdentificationNumber?: string;

  @Field(() => String, { nullable: true, description: 'Intra-community VAT number' })
  intraCommunityVatNumber?: string;

  // @Field(() => [SiteEntity], {
  //   nullable: 'itemsAndList',
  //   description: 'List of sites associated with the company',
  // })
  // sites?: SiteEntity[];

  // @Field(() => String, { nullable: true })
  // defaultAddress?: string;

  @Field(() => [AddressEntity], {
    nullable: 'itemsAndList',
    description: 'List of company addresses',
  })
  addresses?: AddressEntity[];
}
