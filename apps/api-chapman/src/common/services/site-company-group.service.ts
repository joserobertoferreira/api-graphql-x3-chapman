import { LocalMenus } from '@chapman/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CompanyService } from '../../modules/companies/company.service';
import { SiteService } from '../../modules/sites/site.service';
import { SiteCompanyGroup } from '../types/site-company-group.types';

@Injectable()
export class SiteCompanyGroupService {
  constructor(
    private readonly siteService: SiteService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Validates if a zone with property restriction (site/company/group)
   * can be used in the provided reference context.
   *
   * @param zone The zone to be validated (e.g., a site, company or group value).
   * @param context The operation context (e.g.,  a site, company or group value from the request).
   */
  async validate(zone: string, entity: SiteCompanyGroup): Promise<void> {
    const { site, value, entityType } = entity;

    if (zone.trim() === '') return;

    // Check if the entity code exists in the site table
    const isSite = await this.siteService.exists(zone);

    if (isSite) {
      if (zone !== site) {
        const message = `${entityType} ${value} : reserved for site '${zone}'.`;
        throw new BadRequestException(message);
      }
    } else {
      // Get the company information
      const company = await this.companyService.getCompanyByCode(zone, { select: { isLegalCompany: true } });

      if (company?.isLegalCompany === LocalMenus.NoYes.YES) {
        // Get the legal company from site
        const referenceSite = await this.siteService.getSiteByCode(site, { select: { legalCompany: true } });

        if (referenceSite && referenceSite.legalCompany !== zone) {
          const message = `${entityType} ${value} : reserved for the company '${zone}'.`;
          throw new BadRequestException(message);
        }
      } else {
        // The company is not a legal entity, so the value must be valid for the group
        const groupingExists = await this.companyService.siteGroupingExists(zone, site);
        if (!groupingExists) {
          const message = `${entityType} ${value} : reserved for a site grouping '${zone}'.`;
          throw new BadRequestException(message);
        }
      }
    }
  }
}
