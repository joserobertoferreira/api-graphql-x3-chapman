import { Injectable } from '@nestjs/common';
import { Address } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntityTypeGQL } from '../../common/registers/enum-register';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { AddressEntity } from '../addresses/entities/address.entity';

const localMenuToGqlEnum: Record<LocalMenus.EntityType, EntityTypeGQL> = {
  [LocalMenus.EntityType.BUSINESS_PARTNER]: EntityTypeGQL.businessPartner,
  [LocalMenus.EntityType.COMPANY]: EntityTypeGQL.company,
  [LocalMenus.EntityType.SITE]: EntityTypeGQL.site,
  [LocalMenus.EntityType.USER]: EntityTypeGQL.user,
  [LocalMenus.EntityType.ACCOUNTS]: EntityTypeGQL.accounts,
  [LocalMenus.EntityType.LEADS]: EntityTypeGQL.leads,
  [LocalMenus.EntityType.BUILDING]: EntityTypeGQL.building,
  [LocalMenus.EntityType.PLACE]: EntityTypeGQL.place,
};

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  public mapAddressToEntity(address: Address): AddressEntity {
    const phones = [
      address.addressPhoneNumber1,
      address.addressPhoneNumber2,
      address.addressPhoneNumber3,
      address.addressPhoneNumber4,
      address.addressPhoneNumber5,
    ].filter((phone): phone is string => !!phone && phone.trim() !== '');

    const emails = [
      address.addressEmail1,
      address.addressEmail2,
      address.addressEmail3,
      address.addressEmail4,
      address.addressEmail5,
    ].filter((email): email is string => !!email && email.trim() !== '');

    return {
      entityType: localMenuToGqlEnum[address.entityType],
      entityNumber: address.entityNumber,
      code: address.code,
      description: address.description.trim() || undefined,
      addressLine1: address.addressLine1.trim() || undefined,
      addressLine2: address.addressLine2.trim() || undefined,
      addressLine3: address.addressLine3.trim() || undefined,
      zipCode: address.zipCode.trim() || undefined,
      city: address.city.trim() || undefined,
      state: address.state.trim() || undefined,
      country: address.country.trim() || undefined,
      countryName: address.countryName.trim() || undefined,
      phones: phones,
      emails: emails,
      isDefault: address.isDefault === 2,
    };
  }
}
