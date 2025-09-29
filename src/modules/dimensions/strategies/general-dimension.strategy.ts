import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_LEGACY_DATE } from '../../../common/types/common.types';
import { ValidateDimensionContext } from '../../../common/types/dimension.types';
import { isDateRangeValid } from '../../../common/utils/date.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { GeneralDimensionInput } from '../dto/create-dimension.input';
import {
  BaseValidateDimensionContext,
  CreateDimensionContext,
  DimensionValidationStrategy,
} from './dimension-strategy.interface';

@Injectable()
export class GeneralDimensionStrategy implements DimensionValidationStrategy {
  readonly name = 'GeneralDimensionStrategy';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates generic business rules for using a dimension.
   * Rules: The dimension must be active and within the validity date range.
   */
  async validateExistingDimension(context: BaseValidateDimensionContext): Promise<void> {
    const { dimensionData } = context;

    // Check if the dimension is active
    if (dimensionData.isActive !== LocalMenus.NoYes.YES) {
      throw new BadRequestException(
        `Dimension ${dimensionData.dimensionType} "${dimensionData.dimension}" is inactive and cannot be used.`,
      );
    }

    // // b. Verifique a data de validade, se uma data de referência foi fornecida
    // if (referenceDate) {
    //   if (!isDateInRange(referenceDate, dimensionData.validityStartDate, dimensionData.validityEndDate)) {
    //     throw new BadRequestException(
    //       `Dimension ${dimensionData.dimensionType} "${dimensionData.dimension}" is not valid for the date ${referenceDate.toISOString().split('T')[0]}.`,
    //     );
    //   }
    // }
  }

  /**
   * Validate and build the context for creating a dimension.
   * @param context - The context containing input data for creating a dimension.
   * @returns A partial ValidateDimensionContext with validated data.
   * @throws BadRequestException, NotFoundException, or ConflictException if validation fails.
   */
  async validateAndBuildContext(context: CreateDimensionContext): Promise<Partial<ValidateDimensionContext>> {
    let validatedContext: Partial<ValidateDimensionContext> = { ...context.input };

    const { dimensionType, dimension, pioneerReference, general, service, flight } = context.input;

    // Check if the dimension type exists
    const carryForward = await this.getCarryForward(dimensionType);

    // Check if the dimension already exists
    await this.validateDimensionUniqueness(dimensionType, dimension, pioneerReference);

    // Validate general section.
    const generalValidation = await this.generalValidation(general, dimensionType);

    // Set carryForward based on dimension type settings
    validatedContext.carryForward = carryForward;

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
      validatedContext.general = generalValidation;
    }

    // Return the validated context
    return validatedContext;
  }

  /**
   * Validate if the dimension type exists and if it allows carry forward.
   * @param dimensionType - The dimension type to validate.
   * @returns The carry forward setting for the dimension type.
   * @throws NotFoundException if the dimension type does not exist.
   */
  private async getCarryForward(dimensionType: string): Promise<LocalMenus.NoYes> {
    const exists = await this.prisma.dimensionType.findUnique({
      where: { dimensionType: dimensionType },
      select: { noCarryForward: true },
    });
    if (!exists) {
      throw new NotFoundException(`Dimension type "${dimensionType}" does not exist.`);
    }
    return exists.noCarryForward === LocalMenus.NoYes.YES ? LocalMenus.NoYes.NO : LocalMenus.NoYes.YES;
  }

  /**
   * Validate that a dimension with the same type, code, and pioneer reference does not already exist.
   * @param dimensionType - The dimension type.
   * @param dimension - The dimension code.
   * @param pioneerReference - The pioneer reference (optional).
   * @throws ConflictException if a duplicate dimension is found.
   */
  private async validateDimensionUniqueness(
    dimensionType: string,
    dimension: string,
    pioneerReference?: string | null,
  ): Promise<void> {
    if (pioneerReference === null) {
      throw new BadRequestException(`'pioneerReference' cannot be null.`);
    }

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
  }

  /**
   * Make additional general validations
   * @param general - The general dimension data to validate.
   * @param dimensionType - The dimension type.
   */
  private async generalValidation(
    general: GeneralDimensionInput | undefined,
    dimensionType: string,
  ): Promise<GeneralDimensionInput | undefined> {
    if (!general) return undefined;

    let validFromDate: Date | undefined;
    let validUntilDate: Date | undefined;

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
    await this.validateOtherDimensions(otherDimensions, dimensionType);

    return {
      ...general,
      validFrom: validFromDate,
      validUntil: validUntilDate,
    };
  }

  /**
   * Validate other dimensions if provided.
   * @param otherDimensions - The list of other dimensions to validate.
   * @param dimensionType - The main dimension type.
   * @throws BadRequestException if there are validation errors.
   * @throws NotFoundException if any of the other dimensions do not exist.
   */
  private async validateOtherDimensions(
    otherDimensions: { dimensionType: string; dimension: string }[] | undefined,
    dimensionType: string,
  ): Promise<void> {
    if (otherDimensions === undefined) return;

    if (otherDimensions === null) {
      throw new BadRequestException(`'otherDimensions' cannot be null.`);
    }
    if (otherDimensions.length === 0) {
      throw new Error("'otherDimensions' must contain at least one dimension if provided.");
    }

    // Validate other dimensions if provided.
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
