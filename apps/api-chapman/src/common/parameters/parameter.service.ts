import { Injectable } from '@nestjs/common';
import { ParameterValue } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParametersService {
  constructor(private readonly prisma: PrismaService) {}

  // /**
  //  * Retrieves the value for the specified parameter.
  //  * @param company Company
  //  * @param site Site
  //  * @param code Parameter code
  //  * @returns The found ParameterValue object or null if it does not exist.
  //  */
  // async getParameterValue(company: string, site: string, code: string): Promise<ParameterValue | null> {
  //   try {
  //     return await this.prisma.parameterValue.findUnique({
  //       where: { company_siteOrLegislationCode_code: { company: company, siteOrLegislationCode: site, code: code } },
  //     });
  //   } catch (error) {
  //     console.error('Erro ao buscar valor do parâmetro:', error);
  //     throw new Error('Could not retrieve the parameter value.');
  //   }
  // }

  /**
   * Search for a parameter value following the hierarchy: Legislation -> Site -> Company -> Global.
   * @param legislation - The legislation code.
   * @param site - The site code.
   * @param company - The company code.
   * @param code - The parameter code.
   * @returns The found ParameterValue or null if not found.
   */
  async getParameterValue(
    legislation: string,
    site: string,
    company: string,
    code: string,
  ): Promise<ParameterValue | null> {
    // Try to find the parameter value in the hierarchy order
    const searchOrder = [
      { company: '*', siteOrLegislationCode: legislation }, // Legislation level
      { company: '', siteOrLegislationCode: site }, // Site level
      { company: company, siteOrLegislationCode: '' }, // Company level
      { company: '', siteOrLegislationCode: '' }, // Global level
    ];

    for (const condition of searchOrder) {
      const parameterValue = await this.prisma.parameterValue.findUnique({
        where: { company_siteOrLegislationCode_code: { ...condition, code: code } },
      });

      if (parameterValue) {
        return parameterValue;
      }
    }

    return null;
  }
}
