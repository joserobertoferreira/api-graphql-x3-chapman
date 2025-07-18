import { Injectable } from '@nestjs/common';
import { Site } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteEntity } from './entities/site.entity';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps a Prisma Site entity to a SiteEntity.
   * @param site - The Prisma Site entity.
   * @returns The mapped SiteEntity.
   */
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

  /**
   * Verifica de se o site existe
   * @param siteCode - O código do site a ser verificado.
   * @returns `true` se o site existir, `false` caso contrário.
   */
  async exists(siteCode: string): Promise<boolean> {
    const count = await this.prisma.site.count({
      where: { siteCode },
    });

    return count > 0;
  }

  /**
   * Busca um site pelo código.
   * @param siteCode - O código do site a ser buscado.
   * @returns O SiteEntity correspondente ou null se não encontrado.
   */
  async findOne(siteCode: string): Promise<SiteEntity | null> {
    const site = await this.prisma.site.findUnique({
      where: { siteCode },
    });

    if (!site) {
      return null;
    }

    return this.mapToEntity(site);
  }
}
