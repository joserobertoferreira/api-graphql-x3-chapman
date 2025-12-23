import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseValidateDimensionContext, ValidateDimensionContext } from '../../../common/types/dimension.types';
import { isEmailValid } from '../../../common/utils/common.utils';
import { CreateDimensionContext, DimensionValidationStrategy } from './dimension-strategy.interface';

@Injectable()
export class BrokerDimensionStrategy implements DimensionValidationStrategy {
  readonly name = 'BrokerDimensionStrategy';

  constructor() {}

  /**
   * Validates broker business rules for using a dimension.
   */
  async validateExistingDimension(context: BaseValidateDimensionContext): Promise<void> {
    const { dimensionData } = context;
  }

  /**
   * Validates and builds the context for creating or updating a broker dimension.
   * @param context - The context containing input data for the dimension.
   * @returns A partial validated context with any necessary transformations.
   * @throws BadRequestException if validation fails.
   */
  async validateAndBuildContext(context: CreateDimensionContext): Promise<Partial<ValidateDimensionContext>> {
    let validatedContext: Partial<ValidateDimensionContext> = { ...context.input };

    const { general } = context.input;

    // Validate general section.
    if (general) {
      // Check if fixture customer exists in the Customers.
      if ('fixtureCustomer' in general && general.fixtureCustomer !== undefined) {
        throw new BadRequestException(`Fixture customer not allowed for broker dimension.`);
      }

      // Check broker email was provided.
      if ('brokerEmail' in general) {
        if (!general.brokerEmail) {
          throw new BadRequestException(`'brokerEmail' cannot be null or an empty string.`);
        }
        if (!isEmailValid(general.brokerEmail)) {
          throw new BadRequestException(`'brokerEmail' is not a valid email address.`);
        }
      }
    }

    return validatedContext;
  }
}
