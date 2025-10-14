import { Dimensions } from 'src/generated/prisma';
import { ValidateDimensionContext } from '../../../common/types/dimension.types';
import { CreateDimensionInput } from '../dto/create-dimension.input';

export interface CreateDimensionContext {
  /**
   * Initial input for creating a dimension.
   */
  input: CreateDimensionInput;
  carryForward?: number | null;
}

export interface BaseValidateDimensionContext {
  /**
   * Data of the dimension to be validated, already read from the database.
   */
  dimensionData: Dimensions;
  referenceDate?: Date;
  referenceCompany?: string;
  referenceSite?: string;
  isLegalCompany?: boolean;
}

export interface DimensionValidationStrategy {
  readonly name: string;

  /**
   * Validates the given dimension object against the provided context.
   * @param context - The context containing input and dimension type data
   * @returns - A promise that resolves if validation is successful
   * @throws - BadRequestException if the validation fails
   */
  validateAndBuildContext(context: CreateDimensionContext): Promise<Partial<ValidateDimensionContext> | void>;

  /**
   * Valid for the USAGE context.
   * Accepts the basic context, as the strategy should not know the details
   * of the journal entry, sales invoice, etc.
   * @param context - The context containing dimension data and type data
   * @returns - A promise that resolves if validation is successful
   * @throws - BadRequestException if the validation fails
   */
  validateExistingDimension(context: BaseValidateDimensionContext): Promise<void>;
}
