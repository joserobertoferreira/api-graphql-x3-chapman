import { BadRequestException } from '@nestjs/common';
import { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';

/**
 * Executes a custom validator and throws a structured BadRequestException on failure.
 *
 * @param validator - The custom validator instance to execute.
 * @param input - The DTO object to be validated.
 * @throws BadRequestException - If validation returns `false`.
 */
export async function executeAndThrowOnValidationFailure(
  validator: ValidatorConstraintInterface,
  input: any, // DTO input (ex: CreateJournalEntryInput)
): Promise<void> {
  // Create "fake" arguments that the validator needs
  const fakeArgs: ValidationArguments = {
    value: input,
    constraints: [],
    targetName: input.constructor.name,
    object: input,
    property: 'classValidation', // Placeholder
  };

  // Execute validation
  const isValid = await validator.validate(input, fakeArgs);

  // If validation fails, format and throw the error
  if (!isValid) {
    const validationResult =
      typeof validator.defaultMessage === 'function' ? validator.defaultMessage(fakeArgs) : 'Validation failed';

    let errorDetail: { field: string; message: string };

    if (typeof validationResult === 'object' && 'field' in validationResult && 'message' in validationResult) {
      errorDetail = validationResult as { field: string; message: string };
    } else {
      errorDetail = {
        field: input.constructor.name, // Use the DTO class name as fallback
        message: String(validationResult),
      };
    }

    throw new BadRequestException({
      message: 'Input validation failed',
      errors: [errorDetail],
    });
  }
}
