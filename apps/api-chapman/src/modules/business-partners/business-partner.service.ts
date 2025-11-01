import { LocalMenus } from '@chapman/utils';
import { Injectable } from '@nestjs/common';
import { BusinessPartner, Prisma, Site } from 'src/generated/prisma';
import { FindBusinessPartnersArgs, IntersiteContext } from '../../common/types/business-partner.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyService } from '../companies/company.service';

type SenderInfo =
  | { isActive: LocalMenus.NoYes; partialDelivery: number; customerCode: string }
  | { isActive: LocalMenus.NoYes; supplierCode: string };

@Injectable()
export class BusinessPartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Check if a business partner exists.
   * @param code The business partner code to check.
   * @returns True if the business partner exists, false otherwise.
   */
  async businessPartnerExists(code: string): Promise<boolean> {
    const partner = await this.prisma.businessPartner.findUnique({
      where: { code },
    });
    return partner !== null;
  }

  /**
   * Finds a business partner by its unique code (BPRNUM_0).
   * @param code The business partner code.
   * @param include Object to include relations, such as addresses. Example: { addresses: true }
   * @returns The found BusinessPartner object or null if it does not exist.
   */
  async findBusinessPartnerByCode<I extends Prisma.BusinessPartnerInclude>(
    code: string,
    include?: I,
  ): Promise<Prisma.BusinessPartnerGetPayload<{ include: I }> | null> {
    try {
      const partner = await this.prisma.businessPartner.findUnique({
        where: { code },
        include,
      });

      return partner as Prisma.BusinessPartnerGetPayload<{ include: I }> | null;
    } catch (error) {
      console.error('Erro ao buscar parceiro de negócio por código:', error);
      throw new Error('Could not fetch business partner code.');
    }
  }

  /**
   * Retrieves a list of business partners with filtering, sorting, and pagination options.
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async findBusinessPartners<T extends FindBusinessPartnersArgs>(
    args: T,
  ): Promise<Prisma.BusinessPartnerGetPayload<T>[]> {
    // Ensure that select or include is provided to avoid fetching all fields by default
    if (args.select && args.include) {
      throw new Error('Cannot use both select and include in the same query.');
    }

    try {
      return (await this.prisma.businessPartner.findMany(args)) as any;
    } catch (error) {
      console.error('Erro ao buscar lista de parceiros de negócio:', error);
      throw new Error('Could not fetch business partners.');
    }
  }

  /**
   * Creates a new business partner.
   * @param data The data to create the new business partner.
   * @returns The newly created BusinessPartner object.
   */
  async createBusinessPartner(data: Prisma.BusinessPartnerCreateInput): Promise<BusinessPartner> {
    try {
      return await this.prisma.businessPartner.create({
        data,
      });
    } catch (error) {
      console.error('Erro ao criar parceiro de negócio:', error);
      throw new Error('Could not create business partner.');
    }
  }

  /**
   * Update an existing business partner identified by its code.
   * @param code The code of the partner to be updated.
   * @param data The data to be updated.
   * @returns The updated BusinessPartner object.
   */
  async updateBusinessPartner(code: string, data: Prisma.BusinessPartnerUpdateInput): Promise<BusinessPartner> {
    try {
      return await this.prisma.businessPartner.update({
        where: { code },
        data,
      });
    } catch (error) {
      console.error(`Error updating partner with code ${code}:`, error);
      throw new Error('Could not update business partner.');
    }
  }

  /**
   * Deletes a business partner identified by its code.
   * @param code The code of the partner to be deleted.
   * @returns The deleted BusinessPartner object.
   */
  async deleteBusinessPartner(code: string): Promise<BusinessPartner> {
    try {
      // ATENÇÃO: Verifique as regras de negócio! A deleção pode ser bloqueada
      // por constraints de chave estrangeira se houver endereços associados.
      // Pode ser necessário deletar os endereços primeiro ou usar deleção em cascata.
      return await this.prisma.businessPartner.delete({
        where: { code },
      });
    } catch (error) {
      console.error(`Erro ao deletar o parceiro com código ${code}:`, error);
      throw new Error('Could not delete business partner.');
    }
  }

  /**
   * Check if it is a Intersite transaction
   * @param originSite The site where the order will be created.
   * @param senderType The type of sender (e.g., supplier, customer).
   * @param sender The sender whose data will be used in the header.
   * @returns An object containing intersite transaction validation information.
   */
  async isIntersiteTransaction(
    originSite: Site,
    senderType: LocalMenus.BusinessPartnerType,
    sender: BusinessPartner,
  ): Promise<IntersiteContext> {
    // Standard return object
    const baseReturn: IntersiteContext = {
      isIntersite: LocalMenus.NoYes.NO,
      isInterCompany: LocalMenus.NoYes.NO,
      senderType: LocalMenus.BusinessPartnerType.CUSTOMER,
      sender: '',
      sendingSite: '',
      shippingSite: '',
      invoicingSite: '',
      partialDelivery: LocalMenus.NoYes.NO,
    };

    const senderDescription = senderType === LocalMenus.BusinessPartnerType.CUSTOMER ? 'Customer' : 'Supplier';

    // Get the information of the origin site
    const originSiteInfo = await this.prisma.businessPartner.findFirst({
      where: { isIntersite: LocalMenus.NoYes.YES, businessPartnerSite: originSite.siteCode },
    });

    if (
      !originSiteInfo ||
      originSiteInfo.businessPartnerSite.trim() === '' ||
      sender.businessPartnerSite.trim() === ''
    ) {
      return baseReturn;
    }

    // Check if the sender must not be associated with the same site as the order
    if (originSite.siteCode === sender.businessPartnerSite) {
      throw new Error(`${sender.code} ${originSite.siteCode} The ${senderDescription} and origin site are identical.`);
    }

    // Check if the site associated with the sender exists
    const site = await this.prisma.site.findUnique({
      where: { siteCode: sender.businessPartnerSite },
    });
    if (!site) {
      throw new Error(
        `${sender.code} ${sender.businessPartnerSite} The ${senderDescription}'s associated site does not exist.`,
      );
    }

    // Check if the business partner associated with origin site is a customer
    let senderCode = '';
    let senderInfo: SenderInfo | null = null;

    if (senderType === LocalMenus.BusinessPartnerType.CUSTOMER) {
      if (originSiteInfo.isCustomer !== LocalMenus.NoYes.YES) {
        throw new Error(`${originSite.siteCode} Intersite: The site is not a customer BP.`);
      }

      // Read the customer associated with the origin site
      senderInfo = await this.prisma.customer.findUnique({
        where: { customerCode: originSiteInfo.code },
        select: { customerCode: true, isActive: true, partialDelivery: true },
      });
      if (!senderInfo || senderInfo.isActive !== LocalMenus.NoYes.YES) {
        throw new Error(`${originSiteInfo.code} : Inactive customer.`);
      }
      senderCode = senderInfo.customerCode;
    } else {
      // Check if the business partner associated with origin site is a supplier
      if (originSiteInfo.isSupplier !== LocalMenus.NoYes.YES) {
        throw new Error(`${originSite.siteCode} Intersite: The site is not a supplier BP.`);
      }

      // Read the supplier associated with the origin site
      senderInfo = await this.prisma.supplier.findUnique({
        where: { supplierCode: originSiteInfo.code },
        select: { supplierCode: true, isActive: true },
      });
      if (!senderInfo || senderInfo.isActive !== LocalMenus.NoYes.YES) {
        throw new Error(`${originSiteInfo.code} : Inactive customer.`);
      }
      senderCode = senderInfo.supplierCode;
    }

    // The order customer/supplier must be authorized for the company of the sales site
    const authorization = await this.companyService.companySiteThirdPartyAuthorization(
      senderCode,
      sender.businessPartnerSite,
    );
    if (!authorization || !authorization.isValid) {
      const message = authorization.message ? ` - ${authorization.message}` : '' + ` ${site.legalCompany}`;
      throw new Error(message);
    }

    if (senderType === LocalMenus.BusinessPartnerType.CUSTOMER) {
      // Check if the site associated with the sender is purchasing
      if (site.purchasing !== LocalMenus.NoYes.YES) {
        throw new Error(`Intersite: The customer is not a purchase site.`);
      }
    } else {
      // Check if the site associated with the sender is selling
      if (site.sales !== LocalMenus.NoYes.YES) {
        throw new Error(`Intersite: The supplier is not a sales site.`);
      }
    }

    const isInterCompany = site.legalCompany !== originSite.legalCompany;

    return {
      ...baseReturn,
      isIntersite: LocalMenus.NoYes.YES,
      isInterCompany: isInterCompany ? LocalMenus.NoYes.YES : LocalMenus.NoYes.NO,
      senderType: senderType,
      sender: senderCode,
      sendingSite: sender.businessPartnerSite,
      shippingSite: sender.businessPartnerSite,
      invoicingSite: sender.businessPartnerSite,
      partialDelivery: 'partialDelivery' in senderInfo ? senderInfo.partialDelivery : LocalMenus.NoYes.NO,
    };
  }
}
