import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Dimensions } from '@prisma/client';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonService } from '../../common/services/common.service';
import { DimensionsValidator } from '../../common/validators/dimensions.validator';
import { CompanyService } from '../companies/company.service';
import { CustomerService } from '../customers/customer.service';
import { DimensionTypeService } from '../dimension-types/dimension-type.service';
import { SiteService } from '../sites/site.service';
import { CreateDimensionInput } from './dto/create-dimension.input';
import { DimensionFilterInput } from './dto/filter-dimension.input';
import { DimensionConnection } from './entities/dimension-connection.entity';
import { DimensionEntity, OtherDimensionEntity } from './entities/dimension.entity';
import { buildPayloadCreateDimension, buildPayloadCreateTranslationText } from './helpers/dimension-payload-builder';
import { validateNewDimension } from './helpers/dimension-validation.helper';
import { buildDimensionsWhereClause } from './helpers/dimension-where-builder';

@Injectable()
export class DimensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dimensionTypeService: DimensionTypeService,
    private readonly dimensionsValidator: DimensionsValidator,
    private readonly customerService: CustomerService,
    private readonly siteService: SiteService,
    private readonly companyService: CompanyService,
    private readonly commonService: CommonService,
  ) {}

  public mapToEntity(dimension: Dimensions): DimensionEntity {
    const otherDimensions: OtherDimensionEntity[] = [];

    for (let i = 0; i < 20; i++) {
      const typeCode = dimension[`otherDimension${i + 1}` as keyof Dimensions] as string;
      const value = dimension[`defaultDimension${i + 1}` as keyof Dimensions] as string;

      if (typeCode && typeCode.trim() !== '') {
        otherDimensions.push({ dimensionType: typeCode, dimension: value || '' });
      }
    }

    return {
      dimension: dimension.dimension,
      dimensionType: dimension.dimensionType,
      description: dimension.description,
      isActive: dimension.isActive === 2,
      site: dimension.site,
      fixtureCustomerCode: dimension.fixtureCustomer,
      brokerEmail: dimension.brokerEmail,
      otherDimensions: otherDimensions,
    };
  }

  /**
   * Check if the dimension exists.
   * @param typeCode - Dimension type to search for.
   * @param value - Dimension value to search for.
   * @returns `true` if the dimension exists, `false` otherwise.
   */
  async exists(typeCode: string, value: string): Promise<boolean> {
    const count = await this.prisma.dimensions.count({
      where: { dimensionType: typeCode, dimension: value },
    });

    return count > 0;
  }

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

    return this.mapToEntity(dimension);
  }

  async findPaginated(args: PaginationArgs, filter: DimensionFilterInput): Promise<DimensionConnection> {
    const { first, after } = args;

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
      node: this.mapToEntity(dim),
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
  async create(input: CreateDimensionInput): Promise<DimensionEntity> {
    // 1. Check if the dimension already exists
    const existingDimension = await this.exists(input.dimensionType, input.dimension);
    if (existingDimension) {
      throw new ConflictException(
        `Dimension with type "${input.dimensionType}" and code "${input.dimension}" already exists.`,
      );
    }

    // Validate the new dimension
    const groupInfo = await validateNewDimension(
      input,
      this.dimensionTypeService,
      this.dimensionsValidator,
      this.customerService,
      this.siteService,
      this.companyService,
      this.commonService,
    );

    // Create the record in the database
    const createDimension = await this.prisma.$transaction(async (tx) => {
      // Build the payload for creating the dimension
      const payload = await buildPayloadCreateDimension(input, groupInfo, this.companyService);

      // Build the payload for creating the translation texts
      const translationPayload = await buildPayloadCreateTranslationText(
        payload.translatableDescription ?? '',
        payload.dimensionType ?? '',
        payload.dimension ?? '',
      );

      // Create the translation text
      const text = await tx.textToTranslate.create({
        data: translationPayload,
      });

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
}
