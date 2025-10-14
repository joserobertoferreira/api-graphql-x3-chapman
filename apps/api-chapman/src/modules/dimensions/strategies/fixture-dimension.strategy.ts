import { BadRequestException, Injectable } from '@nestjs/common';
import { CommonService } from '../../../common/services/common.service';
import { DEFAULT_LEGACY_DATE } from '../../../common/types/common.types';
import { ValidateDimensionContext } from '../../../common/types/dimension.types';
import { formatDateToDDMMYY, isDateInRange, isDateRangeValid } from '../../../common/utils/date.utils';
import { CustomerService } from '../../customers/customer.service';
import {
  BaseValidateDimensionContext,
  CreateDimensionContext,
  DimensionValidationStrategy,
} from './dimension-strategy.interface';

@Injectable()
export class FixtureDimensionStrategy implements DimensionValidationStrategy {
  readonly name = 'FixtureDimensionStrategy';

  constructor(
    private readonly commonService: CommonService,
    private readonly customerService: CustomerService,
  ) {}

  /**
   * Validates fixture business rules for using a dimension.
   */
  async validateExistingDimension(context: BaseValidateDimensionContext): Promise<void> {
    const { dimensionData, referenceDate } = context;

    // Check if the reference date is within the service date range.
    if (referenceDate) {
      if (!isDateInRange(referenceDate, dimensionData.serviceStartDate, dimensionData.serviceEndDate)) {
        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        const errorMessage =
          `Fixture dimension ${dimensionData.dimension} is not valid for the selected ` +
          `service dates. The service range is ${formatDate(dimensionData.serviceStartDate)} ` +
          `to ${formatDate(dimensionData.serviceEndDate)}.`;

        throw new BadRequestException(errorMessage);
      }
    }
  }

  /**
   * Validates and builds the context for creating or updating a fixture dimension.
   * @param context - The context containing input data for the dimension.
   * @returns A partial validated context with any necessary transformations.
   * @throws BadRequestException if validation fails.
   */
  async validateAndBuildContext(context: CreateDimensionContext): Promise<Partial<ValidateDimensionContext>> {
    let validatedContext: Partial<ValidateDimensionContext> = { ...context.input };
    let validFromDate: Date | undefined;
    let validUntilDate: Date | undefined;
    let { additionalInfo } = context.input;

    const { general, service, flight } = context.input;

    // Validate general section.
    if (general) {
      const { fixtureCustomer, brokerEmail } = general;

      // Check broker email was provided.
      if (brokerEmail !== undefined) {
        throw new BadRequestException(`'brokerEmail' is not allowed for fixture dimensions.`);
      }

      // Check if fixture customer exists in the Customers.
      if (fixtureCustomer) {
        const customerExists = await this.customerService.exists(fixtureCustomer);
        if (!customerExists) {
          throw new BadRequestException(`Fixture customer ${fixtureCustomer} does not exist.`);
        }
      }
    }

    // Validate service section.
    if (service) {
      const salesPerson = service?.salesPerson;

      let { serviceDateStart, serviceDateEnd } = service;

      // Validate valid dates.
      if (serviceDateStart === null) {
        throw new BadRequestException(`'serviceDateStart' cannot be null.`);
      }
      if (serviceDateStart === undefined) {
        validFromDate = DEFAULT_LEGACY_DATE;
      } else {
        validFromDate = new Date(serviceDateStart);
      }

      if (serviceDateEnd === null) {
        throw new BadRequestException(`'serviceDateEnd' cannot be null.`);
      }
      if (serviceDateEnd === undefined) {
        validUntilDate = DEFAULT_LEGACY_DATE;
      } else {
        validUntilDate = new Date(serviceDateEnd);
      }

      // Validate date range.
      const datesOk = isDateRangeValid(validFromDate, validUntilDate);
      if (!datesOk) {
        throw new BadRequestException(`Invalid date range: 'serviceDateStart' must be before 'serviceDateEnd'.`);
      }

      // Check if sales person exists in the Miscellaneous table (6000).
      if (salesPerson) {
        const salesPersonExists = await this.commonService.miscellaneousTableExists(6000, salesPerson);
        if (!salesPersonExists) {
          throw new BadRequestException(`Sales person ${salesPerson} does not exist.`);
        }
      }
    }

    if ((!additionalInfo || additionalInfo.trim() === '') && !flight) {
      throw new BadRequestException(`'additionalInfo' is required when 'flight' is not provided.`);
    }

    if (flight) {
      const { flightReference, flightOrigin, flightDestination, flightDate } = flight;

      // Validate flight date.
      if (!flightDate) {
        throw new BadRequestException(`'flightDate' is required when 'flight' is provided.`);
      }

      // Construct additionalInfo if not provided.
      const flightDateString = flightDate ? formatDateToDDMMYY(flightDate) : '';
      additionalInfo = `${flightDateString} - ${flightOrigin ?? ''} - ${flightDestination ?? ''} - ${flightReference ?? ''}`;

      validatedContext = {
        additionalInfo,
      };
    }

    return validatedContext;
  }
}
