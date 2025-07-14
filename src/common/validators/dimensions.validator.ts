import { Injectable } from '@nestjs/common';
import { ValidatorConstraint } from 'class-validator';
import { DimensionInput } from '../../modules/sales-order/dto/dimension.input';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ name: 'dimensionsValidator', async: true })
@Injectable()
export class DimensionsValidator {
  private lastErrorMessage: string = 'Invalid dimensions provided.';

  constructor(private readonly prisma: PrismaService) {}

  async validate(dimensions: DimensionInput[]): Promise<boolean> {
    if (!dimensions || dimensions.length === 0) {
      return true;
    }

    // 1. Coleta todos os tipos e valores para validação em lote
    const typeCodesToValidate = dimensions.map((d) => d.typeCode);
    const valuePairsToValidate = dimensions.map((d) => ({
      dimensionType: d.typeCode,
      dimension: d.value,
    }));

    // 2. Executa as validações no banco de dados em paralelo
    const [existingTypes, existingValues] = await Promise.all([
      this.prisma.dimensionType.findMany({
        where: { dimensionType: { in: typeCodesToValidate } },
        select: { dimensionType: true },
      }),
      this.prisma.dimensions.findMany({
        where: { OR: valuePairsToValidate },
        select: { dimensionType: true, dimension: true },
      }),
    ]);

    // 3. Verifica os resultados
    const foundTypeCodes = new Set(existingTypes.map((t) => t.dimensionType));
    const nonExistentTypes = typeCodesToValidate.filter((code) => !foundTypeCodes.has(code));

    if (nonExistentTypes.length > 0) {
      this.lastErrorMessage = `The following dimension types do not exist: ${[...new Set(existingTypes)].join(', ')}`;
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return this.lastErrorMessage;
  }
}
