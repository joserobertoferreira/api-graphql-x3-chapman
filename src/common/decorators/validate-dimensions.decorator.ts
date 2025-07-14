import { registerDecorator, ValidationOptions } from 'class-validator';
import { DimensionsValidator } from '../validators/dimensions.validator';

export function ValidateDimensions(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateDimensions',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: DimensionsValidator,
    });
  };
}
