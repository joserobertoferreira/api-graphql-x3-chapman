import { BadRequestException, Injectable } from '@nestjs/common';
import { ValidateDimensionContext } from '../../common/types/dimension.types';
import { DimensionTypeService } from '../dimension-types/dimension-type.service';
import { CreateDimensionInput } from './dto/create-dimension.input';
import { DimensionFilterInput } from './dto/filter-dimension.input';
import { FlightDimensionEntity } from './entities/dimension.entity';
import { DimensionStrategyFactory } from './strategies/dimension-strategy.factory';

@Injectable()
export class DimensionContextService {
  constructor(
    private readonly dimensionTypeService: DimensionTypeService,
    private readonly strategyFactory: DimensionStrategyFactory,
  ) {}

  /**
   * Check if the dimension type exists.
   * @param dimensionTypeCode - The code of the dimension type to check.
   * @throws BadRequestException if the dimension type does not exist.
   */
  async validateDimensionTypeExists(dimensionTypeCode: string): Promise<void> {
    const dimensionType = await this.dimensionTypeService.exists(dimensionTypeCode);
    if (!dimensionType) {
      throw new BadRequestException(`Dimension type with code "${dimensionTypeCode}" does not exist.`);
    }
  }

  /**
   * Build and validate the creation context to create a dimension.
   * @param input - The DTO input for creating a dimension.
   * @returns - A promise with the validated context.
   * @throws BadRequestException if validation fails.
   */
  async buildValidateContext(input: CreateDimensionInput): Promise<ValidateDimensionContext> {
    // Validation factory to get the appropriate strategy
    const strategies = this.strategyFactory.getStrategy(input.dimensionType);
    if (!strategies || strategies.length === 0) {
      throw new BadRequestException(`No validation strategy found for dimension type "${input.dimensionType}".`);
    }

    // Setup the initial context
    const context = {
      input,
      dimensionType: input.dimensionType,
      dimension: input.dimension,
    };

    let validatedContext: Partial<ValidateDimensionContext> = {};

    // Use the strategy to validate the input
    for (const strategy of strategies) {
      const result = await strategy.validateAndBuildContext(context);

      // Merge the validated context from each strategy
      validatedContext = { ...validatedContext, ...result };
    }

    // Remove data redundancy
    const { carryForward } = validatedContext;

    // Final context to return
    const finalContext: ValidateDimensionContext = {
      ...input,
      ...validatedContext,
      general: { ...input.general, ...validatedContext.general },
      service: { ...input.service, ...validatedContext.service },
      flight: input.flight ? ({ ...input.flight, ...validatedContext.flight } as FlightDimensionEntity) : undefined,
      additionalInfo: validatedContext.additionalInfo ?? input.additionalInfo,
      pioneerReference: validatedContext.pioneerReference ?? input.pioneerReference,
      carryForward: carryForward,
    };

    return finalContext;
  }

  /**
   * Validate the filter object for dimensions query.
   * @param filter - The filter object to validate.
   * @throws BadRequestException if validation fails.
   */
  async validateFilter(filter?: DimensionFilterInput): Promise<void> {
    if (!filter) {
      // If the filter is optional, we can return. If it's required, we throw an error.
      // Your DTO has `dimensionTypeCode_equals` as required, so let's validate that.
      throw new BadRequestException('Filter is required.');
    }

    if (!filter.dimensionTypeCode_equals || filter.dimensionTypeCode_equals.trim() === '') {
      throw new BadRequestException('dimensionTypeCode_equals must not be empty.');
    }

    // Check if the dimension type exists
    await this.validateDimensionTypeExists(filter.dimensionTypeCode_equals.trim());

    const isFixtureDimension = filter.dimensionTypeCode_equals?.trim() === 'FIX';
    const isBrokerDimension = filter.dimensionTypeCode_equals?.trim() === 'BRK';

    if (filter.isActive_equals !== undefined && typeof filter.isActive_equals !== 'boolean') {
      throw new BadRequestException('isActive_equals must be a boolean (true or false).');
    }

    // Check if the dimensionTypeCode is a Fixture dimension type
    if (isFixtureDimension) {
      if (filter.fixtureCustomer_equals && filter.fixtureCustomer_equals.trim() === '') {
        throw new BadRequestException(
          'fixtureCustomer_equals is required for FIX dimension type and must not be empty.',
        );
      }
    } else {
      if (filter.fixtureCustomer_equals) {
        throw new BadRequestException('fixtureCustomer_equals is only applicable for FIX dimension type.');
      }
    }

    // Check if the dimensionTypeCode is a Broker dimension type
    if (isBrokerDimension) {
      if (filter.brokerEmail_equals && filter.brokerEmail_equals.trim() === '') {
        throw new BadRequestException('brokerEmail_equals is required for BRK dimension type and must not be empty.');
      }
    } else {
      if (filter.brokerEmail_equals) {
        throw new BadRequestException('brokerEmail_equals is only applicable for BRK dimension type.');
      }
    }
  }
}
