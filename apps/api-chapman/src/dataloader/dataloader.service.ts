import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Address, BusinessPartner, Customer, Dimensions, Products, PurchaseInvoiceLine } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AddressLoaderKey {
  entityType: number;
  entityNumber: string;
}

export interface BpAddressLoaderKey {
  entityType: number;
  entityNumber: string;
  code: string;
}

export interface IDataloaders {
  customerLoader: DataLoader<string, Customer>;
  businessPartnerLoader: DataLoader<string, BusinessPartner>;
  addressLoader: DataLoader<AddressLoaderKey, Address[]>;
  addressByBpLoader: DataLoader<BpAddressLoaderKey, Address>;
  // sitesByCompanyLoader: DataLoader<string, Site[]>;
  productLoader: DataLoader<string, Products>;
  dimensionsByTypeCodeLoader: DataLoader<string, Dimensions[]>;
  invoiceLinesByInvoiceNumberLoader?: DataLoader<string, PurchaseInvoiceLine[]>;
}

@Injectable()
export class DataloaderService {
  constructor(private readonly prisma: PrismaService) {}

  createLoaders(): IDataloaders {
    return {
      customerLoader: this.createCustomerLoader(),
      businessPartnerLoader: this.createBusinessPartnerLoader(),
      addressLoader: this.createAddressLoader(),
      addressByBpLoader: this.createAddressByBpLoader(),
      // sitesByCompanyLoader: this.createSitesByCompanyLoader(),
      productLoader: this.createProductLoader(),
      dimensionsByTypeCodeLoader: this.createDimensionsByTypeCodeLoader(),
      invoiceLinesByInvoiceNumberLoader: this.createInvoiceLinesByInvoiceNumberLoader(),
    };
  }

  private createBusinessPartnerLoader() {
    return new DataLoader<string, BusinessPartner>(async (keys: readonly string[]) => {
      console.log('Batching BusinessPartners for keys:', keys);
      const businessPartners = await this.prisma.businessPartner.findMany({
        where: { code: { in: [...keys] } },
      });

      // É crucial mapear os resultados de volta para a ordem original das chaves
      const businessPartnersMap = new Map(businessPartners.map((bp) => [bp.code, bp]));
      return keys.map((key) => {
        const bp = businessPartnersMap.get(key);
        return bp ? bp : new Error(`BusinessPartner not found for key: ${key}`);
      });
    });
  }

  private createCustomerLoader() {
    return new DataLoader<string, Customer>(async (codes: readonly string[]) => {
      const customers = await this.prisma.customer.findMany({
        where: { customerCode: { in: [...codes] } },
        include: { businessPartner: true },
      });
      const customerMap = new Map(customers.map((c) => [c.customerCode, c]));
      return codes.map((code) => {
        const customer = customerMap.get(code);
        return customer ? customer : new Error(`Customer not found for code: ${code}`);
      });
    });
  }

  // private createSitesByCompanyLoader() {
  //   return new DataLoader<string, Site[]>(async (companyCodes: readonly string[]) => {
  //     console.log('--- Batching Sites for companies:', companyCodes);
  //     const sites = await this.prisma.site.findMany({
  //       where: { legalCompany: { in: [...companyCodes] } },
  //     });

  //     const sitesByCompany = new Map<string, Site[]>();
  //     sites.forEach((site) => {
  //       if (!sitesByCompany.has(site.legalCompany)) {
  //         sitesByCompany.set(site.legalCompany, []);
  //       }
  //       sitesByCompany.get(site.legalCompany)!.push(site);
  //     });

  //     return companyCodes.map((code) => sitesByCompany.get(code) || []);
  //   });
  // }

  private createAddressLoader() {
    return new DataLoader<AddressLoaderKey, Address[]>(async (keys: readonly AddressLoaderKey[]) => {
      console.log('Batching Addresses for keys:', keys);

      const addresses = await this.prisma.address.findMany({
        where: {
          OR: keys.map((key) => ({
            entityType: key.entityType,
            entityNumber: key.entityNumber,
          })),
        },
      });

      // Agrupa os endereços por código do parceiro de negócios
      const addressesMap = new Map<string, Address[]>();

      addresses.forEach((address) => {
        const compositeKey = `${address.entityNumber}:${address.entityType}`;
        if (!addressesMap.has(compositeKey)) {
          addressesMap.set(compositeKey, []);
        }
        addressesMap.get(compositeKey)!.push(address);
      });

      return keys.map((key) => {
        const compositeKey = `${key.entityNumber}:${key.entityType}`;
        const addressesForKey = addressesMap.get(compositeKey);
        return addressesForKey ? addressesForKey : [];
      });
    });
  }

  private createAddressByBpLoader() {
    return new DataLoader<BpAddressLoaderKey, Address>(async (keys) => {
      console.log('--- Batching Addresses by PK for keys:', keys);
      const addresses = await this.prisma.address.findMany({
        where: {
          OR: keys.map((key) => ({
            entityType: key.entityType,
            entityNumber: key.entityNumber,
            code: key.code,
          })),
        },
      });

      const addressMap = new Map<string, Address>();
      addresses.forEach((address) => {
        const compositeKey = `${address.entityType}:${address.entityNumber}:${address.code}`;
        addressMap.set(compositeKey, address);
      });

      return keys.map((key) => {
        const compositeKey = `${key.entityType}:${key.entityNumber}:${key.code}`;
        const address = addressMap.get(compositeKey);

        // Se encontrou o endereço, retorne-o.
        // Se NÃO encontrou, retorne um objeto Error.
        return address || new Error(`No address found for key: ${compositeKey}`);
      });
    });
  }

  private createProductLoader() {
    return new DataLoader<string, any>(async (keys: readonly string[]) => {
      console.log('Batching Products for keys:', keys);
      const products = await this.prisma.products.findMany({
        where: { code: { in: [...keys] } },
        include: { productSales: true },
      });

      // Mapear os resultados de volta para a ordem original das chaves
      const productsMap = new Map(products.map((product) => [product.code, product]));
      return keys.map((key) => productsMap.get(key) || null);
    });
  }

  private createDimensionsByTypeCodeLoader() {
    return new DataLoader<string, Dimensions[]>(async (typeCodes: readonly string[]) => {
      console.log('Batching Dimensions for type codes:', typeCodes);
      const dimensions = await this.prisma.dimensions.findMany({
        where: { dimensionType: { in: [...typeCodes] } },
      });

      const dimensionsByType = new Map<string, Dimensions[]>();
      dimensions.forEach((dim) => {
        if (!dimensionsByType.has(dim.dimensionType)) {
          dimensionsByType.set(dim.dimensionType, []);
        }
        dimensionsByType.get(dim.dimensionType)!.push(dim);
      });

      return typeCodes.map((code) => dimensionsByType.get(code) || []);
    });
  }

  private createInvoiceLinesByInvoiceNumberLoader() {
    return new DataLoader<string, PurchaseInvoiceLine[]>(async (invoiceNumbers: readonly string[]) => {
      const lines = await this.prisma.purchaseInvoiceLine.findMany({
        where: { invoiceNumber: { in: [...invoiceNumbers] } },
        // O include com `productDetails` pode ser útil aqui
      });

      // Agrupa as linhas por `invoiceNumber`
      const linesMap = new Map<string, PurchaseInvoiceLine[]>();
      lines.forEach((line) => {
        if (!linesMap.has(line.invoiceNumber)) {
          linesMap.set(line.invoiceNumber, []);
        }
        linesMap.get(line.invoiceNumber)!.push(line);
      });

      return invoiceNumbers.map((num) => linesMap.get(num) || []);
    });
  }
}
