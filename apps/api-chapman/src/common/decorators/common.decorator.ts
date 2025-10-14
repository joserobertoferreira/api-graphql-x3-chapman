import { registerDecorator, ValidationOptions } from 'class-validator';
import { CurrencyValidator } from '../validators/common.validator';
import { IsMutuallyExclusiveConstraint } from '../validators/is-mutually-exclusive.validator';
import { RequiresOneOfConstraint } from '../validators/requires-one-of.validator';

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

export function IsMutuallyExclusive(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property], // Passamos o nome da outra propriedade para a lógica
      validator: IsMutuallyExclusiveConstraint,
    });
  };
}

export function RequiresOneOf(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: RequiresOneOfConstraint,
    });
  };
}
