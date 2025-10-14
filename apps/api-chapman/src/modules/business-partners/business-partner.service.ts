import { Injectable } from '@nestjs/common';
import { BusinessPartner, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Tipagem para os argumentos de busca, incluindo a opção "include" para carregar relações.
interface FindBusinessPartnersArgs {
  where?: Prisma.BusinessPartnerWhereInput;
  orderBy?: Prisma.BusinessPartnerOrderByWithRelationInput;
  skip?: number;
  take?: number;
  select?: Prisma.BusinessPartnerSelect; // Essencial para selecionar campos específicos
  include?: Prisma.BusinessPartnerInclude; // Essencial para carregar dados relacionados (como endereços)
}

@Injectable()
export class BusinessPartnerService {
  constructor(private readonly prisma: PrismaService) {}

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
}
