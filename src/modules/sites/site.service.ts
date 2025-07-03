import { Injectable } from '@nestjs/common';
import { Site } from '@prisma/client';
import { SiteEntity } from './entities/site.entity';

@Injectable()
export class SiteService {
  mapToEntity(site: Site): SiteEntity {
    return {
      siteCode: site.siteCode,
      siteName: site.siteName,
      standardName: site.standardName,
      country: site.country,
      legalCompany: site.legalCompany,
      legislation: site.legislation,
    };
  }
}
