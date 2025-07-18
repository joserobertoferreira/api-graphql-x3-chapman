import { Injectable } from '@nestjs/common';
import { DimensionType } from '@prisma/client'; // Use o nome do seu modelo Prisma
import { PrismaService } from 'src/prisma/prisma.service';
import { DimensionTypeEntity } from './entities/dimension-type.entity';

@Injectable()
export class DimensionTypeService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(dimType: DimensionType): DimensionTypeEntity {
    return {
      dimension: dimType.dimensionType,
      description: dimType.description,
    };
  }

  /**
   * Verifica de se o tipo de dimensão existe
   * @param code - O código do tipo de dimensão a ser verificado.
   * @returns `true` se o tipo de dimensão existir, `false` caso contrário.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.dimensionType.count({
      where: { dimensionType: code },
    });

    return count > 0;
  }

  async findAll(): Promise<DimensionTypeEntity[]> {
    const dimTypes = await this.prisma.dimensionType.findMany({
      // Adicione um `where` se precisar filtrar (ex: apenas tipos ativos)
      orderBy: { description: 'asc' },
    });
    return dimTypes.map((dt) => this.mapToEntity(dt));
  }

  async findOne(code: string): Promise<DimensionTypeEntity | null> {
    const dimType = await this.prisma.dimensionType.findUnique({
      where: { dimensionType: code },
    });
    return dimType ? this.mapToEntity(dimType) : null;
  }
}
