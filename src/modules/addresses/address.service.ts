import { Injectable } from '@nestjs/common';
import { Address } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddressEntity } from '../addresses/entities/address.entity';

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
      entityType: address.entityType,
      entityNumber: address.entityNumber,
      code: address.code,
      description: address.description,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      addressLine3: address.addressLine3,
      zipCode: address.zipCode,
      city: address.city,
      state: address.state,
      country: address.country,
      countryName: address.countryName,
      phones: phones,
      emails: emails,
      isDefault: address.isDefault === 2,
    };
  }
}
