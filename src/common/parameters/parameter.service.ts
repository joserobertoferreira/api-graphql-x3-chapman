import { Injectable } from '@nestjs/common';
import { ParameterValue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParametersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca o valor para o parâmetro informado
   * @param company Sociedade
   * @param site Estabelecimento
   * @param code Código do parâmetro
   * @returns O objeto ParameterValue encontrado ou null se não existir.
   */
  async getParameterValue(company: string, site: string, code: string): Promise<ParameterValue | null> {
    try {
      return await this.prisma.parameterValue.findUnique({
        where: { company_siteOrLegislationCode_code: { company: company, siteOrLegislationCode: site, code: code } },
      });
    } catch (error) {
      console.error('Erro ao buscar valor do parâmetro:', error);
      throw new Error('Não foi possível buscar o valor do parâmetro.');
    }
  }
}
