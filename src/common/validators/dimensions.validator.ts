import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { DimensionInput } from '../../modules/sales-order/dto/dimension.input';

@ValidatorConstraint({ name: 'dimensionsValidator', async: true })
@Injectable()
export class DimensionsValidator implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async validate(dimensions: DimensionInput[], args: ValidationArguments): Promise<boolean> {
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
      // Anexa a mensagem de erro ao objeto de argumentos para a `defaultMessage`
      (args.object as any)._validation_error_message =
        `The following dimension types do not exist: ${[...new Set(nonExistentTypes)].join(', ')}`;
      return false;
    }

    const foundValues = new Set(existingValues.map((v) => `${v.dimensionType}:${v.dimension}`));
    const nonExistentValues = valuePairsToValidate.filter(
      (pair) => !foundValues.has(`${pair.dimensionType}:${pair.dimension}`),
    );

    if (nonExistentValues.length > 0) {
      const errorMsg = nonExistentValues.map((v) => `value '${v.dimension}' for type '${v.dimensionType}'`).join('; ');
      (args.object as any)._validation_error_message = `The following dimension values do not exist: ${errorMsg}.`;
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return (args.object as any)._validation_error_message || 'Invalid dimensions provided.';
  }
}
