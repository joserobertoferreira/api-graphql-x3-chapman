import { BusinessPartner, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Tipagem para os argumentos de busca, incluindo a opção "include" para carregar relações.
interface FindBusinessPartnersArgs {
  where?: Prisma.BusinessPartnerWhereInput;
  orderBy?: Prisma.BusinessPartnerOrderByWithRelationInput;
  skip?: number;
  take?: number;
  include?: Prisma.BusinessPartnerInclude; // Essencial para carregar dados relacionados (como endereços)
}

export class BusinessPartnerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca um parceiro de negócio pelo seu código único (BPRNUM_0).
   * @param code O código do parceiro de negócio.
   * @param include Objeto para incluir relações, como os endereços. Ex: { addresses: true }
   * @returns O objeto BusinessPartner encontrado ou null se não existir.
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
      throw new Error('Não foi possível buscar o parceiro de negócio.');
    }
  }

  /**
   * Busca uma lista de parceiros de negócio com opções de filtro, ordenação e paginação.
   * @param args Argumentos de busca { where, orderBy, skip, take, include }.
   * @returns Um array de objetos BusinessPartner.
   */
  async findBusinessPartners({
    where,
    orderBy,
    skip,
    take,
    include,
  }: FindBusinessPartnersArgs): Promise<BusinessPartner[]> {
    try {
      return await this.prisma.businessPartner.findMany({
        where,
        orderBy,
        skip,
        take,
        include,
      });
    } catch (error) {
      console.error('Erro ao buscar lista de parceiros de negócio:', error);
      throw new Error('Não foi possível buscar os parceiros de negócio.');
    }
  }

  /**
   * Cria um novo parceiro de negócio.
   * @param data Os dados para criar o novo parceiro de negócio.
   * @returns O objeto BusinessPartner recém-criado.
   */
  async createBusinessPartner(data: Prisma.BusinessPartnerCreateInput): Promise<BusinessPartner> {
    try {
      return await this.prisma.businessPartner.create({
        data,
      });
    } catch (error) {
      console.error('Erro ao criar parceiro de negócio:', error);
      throw new Error('Não foi possível criar o parceiro de negócio.');
    }
  }

  /**
   * Atualiza um parceiro de negócio existente, identificado pelo seu código.
   * @param code O código do parceiro a ser atualizado.
   * @param data Os dados a serem atualizados.
   * @returns O objeto BusinessPartner atualizado.
   */
  async updateBusinessPartner(code: string, data: Prisma.BusinessPartnerUpdateInput): Promise<BusinessPartner> {
    try {
      return await this.prisma.businessPartner.update({
        where: { code },
        data,
      });
    } catch (error) {
      console.error(`Erro ao atualizar o parceiro com código ${code}:`, error);
      throw new Error('Não foi possível atualizar o parceiro de negócio.');
    }
  }

  /**
   * Deleta um parceiro de negócio, identificado pelo seu código.
   * @param code O código do parceiro a ser deletado.
   * @returns O objeto BusinessPartner que foi deletado.
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
      throw new Error('Não foi possível deletar o parceiro de negócio.');
    }
  }
}
