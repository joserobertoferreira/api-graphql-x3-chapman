import { registerDecorator, ValidationOptions } from 'class-validator';
import { CurrencyValidator } from '../validators/common.validator';

/**
 * Decorator which validates if a currency exists.
 * @param validationOptions - Default options from `class-validator`.
 */
export function IsCurrency(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCurrencyValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: CurrencyValidator,
    });
  };
}
