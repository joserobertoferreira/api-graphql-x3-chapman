import { ValidateDimensionContext } from '../../../common/types/dimension.types';
import { CreateDimensionInput } from '../dto/create-dimension.input';

export interface CreateDimensionContext {
  /**
   * Initial input for creating a dimension.
   */
  input: CreateDimensionInput;
  carryForward?: number | null;
}

export interface DimensionValidationStrategy {
  /**
   * Validates the given dimension object against the provided context.
   * @param context - The context containing input and dimension type data
   * @returns - A promise that resolves if validation is successful
   * @throws - BadRequestException if the validation fails
   */
  validateAndBuildContext(context: CreateDimensionContext): Promise<Partial<ValidateDimensionContext> | void>;
}
