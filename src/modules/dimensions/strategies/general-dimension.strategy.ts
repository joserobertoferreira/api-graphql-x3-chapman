import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_LEGACY_DATE } from '../../../common/types/common.types';
import { ValidateDimensionContext } from '../../../common/types/dimension.types';
import { isDateRangeValid } from '../../../common/utils/date.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDimensionContext, DimensionValidationStrategy } from './dimension-strategy.interface';

@Injectable()
export class GeneralDimensionStrategy implements DimensionValidationStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async validateAndBuildContext(context: CreateDimensionContext): Promise<Partial<ValidateDimensionContext>> {
    let validatedContext: Partial<ValidateDimensionContext> = { ...context.input };
    let validFromDate: Date | undefined;
    let validUntilDate: Date | undefined;

    const { dimensionType, dimension, pioneerReference, general, service, flight } = context.input;

    // Check if the dimension type exists
    const dimensionTypeData = await this.prisma.dimensionType.findUnique({
      where: { dimensionType: dimensionType },
      select: { noCarryForward: true },
    });
    if (!dimensionTypeData) {
      throw new NotFoundException(`Dimension type "${dimensionType}" does not exist.`);
    }

    if (pioneerReference === null) {
      throw new BadRequestException(`'pioneerReference' cannot be null.`);
    }

    // Check if the dimension already exists
    const whereClause = [
      { dimensionType: dimensionType, dimension: dimension },
      ...(pioneerReference ? [{ pioneerReference: pioneerReference }] : []),
    ];

    const count = await this.prisma.dimensions.count({
      where: {
        OR: whereClause,
      },
    });
    if (count > 0) {
      if (pioneerReference) {
        throw new ConflictException(`Dimension with pioneer reference "${pioneerReference}" already exists.`);
      } else {
        throw new ConflictException(`Dimension with type "${dimensionType}" and code "${dimension}" already exists.`);
      }
    }

    // Set carryForward based on dimension type settings
    validatedContext.carryForward =
      dimensionTypeData?.noCarryForward === LocalMenus.NoYes.YES ? LocalMenus.NoYes.NO : LocalMenus.NoYes.YES;

    // Validate general section.
    if (general) {
      const { companySiteGroup, otherDimensions } = general;
      let { validFrom, validUntil } = general;

      // Check if exists in the SiteGroups table.
      if (companySiteGroup) {
        const siteExists = await this.prisma.siteGroups.findUnique({
          where: { group: companySiteGroup },
        });
        if (!siteExists) {
          throw new NotFoundException(`Company/Site/Group "${companySiteGroup}" does not exist.`);
        }
      }

      // Validate valid dates.
      if (validFrom === null) {
        throw new BadRequestException(`'validFrom' cannot be null.`);
      }
      if (validFrom === undefined) {
        validFromDate = DEFAULT_LEGACY_DATE;
      } else {
        validFromDate = new Date(validFrom);
      }

      if (validUntil === null) {
        throw new BadRequestException(`'validUntil' cannot be null.`);
      }
      if (validUntil === undefined) {
        validUntilDate = DEFAULT_LEGACY_DATE;
      } else {
        validUntilDate = new Date(validUntil);
      }

      // Validate date range.
      const datesOk = isDateRangeValid(validFromDate, validUntilDate);
      if (!datesOk) {
        throw new BadRequestException(`Invalid date range: 'validFrom' must be before 'validUntil'.`);
      }

      // Validate other dimensions if provided.
      if (otherDimensions !== undefined) {
        if (otherDimensions === null) {
          throw new BadRequestException(`'otherDimensions' cannot be null.`);
        }
        if (otherDimensions.length === 0) {
          throw new Error("'otherDimensions' must contain at least one dimension if provided.");
        }

        // Check for duplicates in the provided other dimensions
        const seenTypes = new Set<string>();
        for (const dim of otherDimensions) {
          if (seenTypes.has(dim.dimensionType)) {
            throw new BadRequestException(
              `Duplicate dimension type in 'otherDimensions': "${dim.dimensionType}" can only be specified once.`,
            );
          }
          seenTypes.add(dim.dimensionType);
        }

        // Check if any of the other dimensions is the same as the main dimension
        if (seenTypes.has(dimensionType)) {
          throw new BadRequestException(
            `The main dimension type "${dimensionType}" cannot also be present in 'otherDimensions'.`,
          );
        }

        // Verify that all other dimensions exist in the database
        const dimensionsToCheck = otherDimensions.map((dim) => ({
          dimensionType: dim.dimensionType,
          dimension: dim.dimension,
        }));

        const exists = await this.prisma.dimensions.findMany({
          where: { OR: dimensionsToCheck },
          select: { dimensionType: true, dimension: true },
        });

        const found = new Set(exists.map((d) => `${d.dimensionType}|${d.dimension}`));
        const notFound = dimensionsToCheck.filter((d) => !found.has(`${d.dimensionType}|${d.dimension}`));

        if (notFound.length > 0) {
          const errorMsg = notFound.map((d) => `type "${d.dimensionType}" and code "${d.dimension}"`).join(', ');
          throw new NotFoundException(`The following 'otherDimensions' do not exist: ${errorMsg}.`);
        }
      }
    }

    if (dimensionType !== 'FIX') {
      // If additional Info is mandatory to be informed if not a fixture dimension
      if (!context.input.additionalInfo || context.input.additionalInfo.trim() === '') {
        throw new BadRequestException(`'additionalInfo' is required for dimension type "${dimensionType}".`);
      }

      if (service || flight) {
        throw new BadRequestException(
          `'service' and 'flight' should not be provided for dimension type "${dimensionType}".`,
        );
      }
    }

    // Build the validated context
    if (general) {
      validatedContext.general = {
        ...general,
        validFrom: validFromDate,
        validUntil: validUntilDate,
      };
    }

    // Return the validated context
    return validatedContext;
  }
}
