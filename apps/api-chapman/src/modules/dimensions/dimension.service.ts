import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { Dimensions } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { DimensionsInput } from '../../common/inputs/dimension.input';
import { DimensionsEntity, DimensionTypeConfig, ValidateDimensionContext } from '../../common/types/dimension.types';
import { DimensionContextService } from './dimension-context.service';
import { CreateDimensionInput } from './dto/create-dimension.input';
import { DimensionFilterInput } from './dto/filter-dimension.input';
import { DimensionConnection } from './entities/dimension-connection.entity';
import { DimensionEntity } from './entities/dimension.entity';
import { mapDimensionToEntity } from './helpers/dimension-mapper';
import {
  buildPayloadCreateDimension,
  buildPayloadCreatePrintPyramid,
  buildPayloadCreateTranslationText,
} from './helpers/dimension-payload-builder';
import { buildDimensionsWhereClause } from './helpers/dimension-where-builder';
import { mandatoryDimension } from './helpers/dimension.helper';

@Injectable()
export class DimensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextService: DimensionContextService,
  ) {}

  /**
   * Get the dimension by type and code.
   * @param typeCode - Dimension type to search for.
   * @param value - Dimension value to search for.
   * @returns The corresponding dimension or null if not found.
   */
  async findOne(typeCode: string, value: string): Promise<DimensionEntity | null> {
    const dimension = await this.prisma.dimensions.findUnique({
      where: { dimensionType_dimension: { dimensionType: typeCode, dimension: value } },
    });

    if (!dimension) {
      throw new NotFoundException(`Dimension with type "${typeCode}" and code "${value}" not found.`);
    }

    return mapDimensionToEntity(dimension);
  }

  async findPaginated(args: PaginationArgs, filter: DimensionFilterInput): Promise<DimensionConnection> {
    const { first, after } = args;

    // Validate the filter
    this.contextService.validateFilter(filter);

    // Build the WHERE clause
    const where = buildDimensionsWhereClause(filter);

    // Pagination logic
    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [dimensions, totalCount] = await this.prisma.$transaction([
      this.prisma.dimensions.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: [{ dimension: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.dimensions.count({ where }),
    ]);

    const hasNextPage = dimensions.length > first;
    const nodes = hasNextPage ? dimensions.slice(0, -1) : dimensions;

    const edges = nodes.map((dim) => ({
      cursor: Buffer.from(dim.ROWID.toString()).toString('base64'),
      node: mapDimensionToEntity(dim),
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
        hasNextPage,
        hasPreviousPage: after ? true : false,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  /**
   * Create a new dimension in the system.
   * @param input - The DTO mutation from the GraphQL mutation.
   * @returns The newly created dimension.
   */
  async create(input: CreateDimensionInput, debug: boolean): Promise<DimensionEntity | null> {
    // Validate and build the context for the new dimension
    const context = await this.contextService.buildValidateContext(input);

    if (debug) {
      await test_validation(context); // TODO: Remove after testing
      return {} as DimensionEntity; // Temporary return for testing
    }

    // Create the record in the database
    const createDimension = await this.prisma.$transaction(async (tx) => {
      // Build the payload for creating the dimension
      const payload = await buildPayloadCreateDimension(context);

      // Build the payload for creating the translation texts
      const translationPayloads = buildPayloadCreateTranslationText(
        payload.dimensionType ?? '',
        payload.dimension ?? '',
        payload.translatableDescription ?? '',
        payload.shortDescription ?? '',
      );

      // Create the translation text
      if (translationPayloads.length > 0) {
        await tx.textToTranslate.createMany({ data: translationPayloads });
      }

      // Build the payload for creating the print pyramid entry
      const pyramidPayload = buildPayloadCreatePrintPyramid(payload.dimensionType ?? '', payload.dimension ?? '');

      // Create the print pyramid entry
      if (pyramidPayload) {
        await tx.printPyramids.create({ data: pyramidPayload });
      }

      // Create the dimension record
      const newDimension = await tx.dimensions.create({
        data: payload,
      });

      return newDimension;
    });

    // Return the mapped entity
    const entity = await this.findOne(createDimension.dimensionType, createDimension.dimension);
    if (!entity) {
      throw new NotFoundException('Created dimension could not be found.');
    }
    return entity;
  }

  /**
   * Validate the dimension data
   */
  getRequiredDimensions(
    lineNumber: number,
    ledgerCode: string,
    lineDimensions: DimensionsInput,
    dimensionEntity: DimensionsEntity[],
    dimensionNames: Map<string, string>,
    dimensionTypesMap: Map<string, DimensionTypeConfig>,
    message: string,
  ): { requiredDimensions: Set<string>; providedDimensions: Map<string, string> } {
    const requiredDimensions = new Set(dimensionEntity.map((d) => d.dimensionType));
    const providedDimensions = new Map<string, string>();

    if (lineDimensions) {
      for (const [field, type] of dimensionTypesMap.entries()) {
        if (lineDimensions[field]) {
          const value = lineDimensions[field];
          providedDimensions.set(type.code, value);
        }
      }
    }

    const prefix = ledgerCode.trim() !== '' ? `Ledger [${ledgerCode}]: ` : '';

    // Validate dimensions against account requirements
    for (const requiredType of requiredDimensions) {
      const dimension = mandatoryDimension(requiredType, dimensionTypesMap);

      // If the dimension is mandatory but not provided, throw an error
      if (dimension?.isMandatory && !providedDimensions.has(requiredType)) {
        throw new BadRequestException(
          `Line #${lineNumber}: ${prefix}Missing required dimension ${dimensionNames.get(requiredType)} ${message}.`,
        );
      }
    }

    // Check for any invalid dimension types provided
    for (const providedType of providedDimensions.keys()) {
      if (!requiredDimensions.has(providedType)) {
        throw new BadRequestException(
          `${prefix}Dimension ${dimensionNames.get(providedType)} is not applicable ${message}.`,
        );
      }
    }

    return { requiredDimensions, providedDimensions };
  }

  /**
   * Return a map with dimensions data for quick lookup during line validation
   *
   */
  async getDimensionsDataMap(
    pairsToValidate: { dimensionType: string; dimension: string }[],
    dimensionTypesMap: Map<string, DimensionTypeConfig>,
  ): Promise<Map<string, Dimensions>> {
    const dimensionNames = new Map<string, string>();
    for (const [field, config] of dimensionTypesMap.entries()) {
      dimensionNames.set(config.code, field);
    }

    // Fetch existing dimensions from the database to validate their existence
    const existingDimensionsData =
      pairsToValidate.length > 0 ? await this.prisma.dimensions.findMany({ where: { OR: pairsToValidate } }) : [];

    // Validate existence. Compare what was requested with what was found.
    if (existingDimensionsData.length < pairsToValidate.length) {
      const foundSet = new Set(existingDimensionsData.map((d) => `${d.dimensionType}|${d.dimension}`));
      const notFound = pairsToValidate.find((p) => !foundSet.has(`${p.dimensionType}|${p.dimension}`));

      // If 'notFound' is found (which will be the case), throw a clear error.
      if (notFound) {
        throw new NotFoundException(
          `Dimension value ${notFound.dimension} does not exist for ${dimensionNames.get(notFound.dimensionType)}.`,
        );
      }
    }

    // Create a map with dimensions data for quick lookup during line validation
    const dimensionsDataMap = new Map<string, Dimensions>(
      existingDimensionsData.map((d) => [`${d.dimensionType}|${d.dimension}`, d]),
    );

    return dimensionsDataMap;
  }
}

// Helper function for testing validation (should be outside the class)
async function test_validation(context: ValidateDimensionContext) {
  const payload = await buildPayloadCreateDimension(context);
  // Build the payload for creating the translation texts
  const translationPayloads = buildPayloadCreateTranslationText(
    payload.dimensionType ?? '',
    payload.dimension ?? '',
    payload.translatableDescription ?? '',
    payload.shortDescription ?? '',
  );
  // Build the payload for creating the print pyramid entry
  const pyramidPayload = buildPayloadCreatePrintPyramid(payload.dimensionType ?? '', payload.dimension ?? '');

  console.log('payload', payload);
  console.log('translationPayloads', translationPayloads);
  console.log('pyramidPayload', pyramidPayload);
}
