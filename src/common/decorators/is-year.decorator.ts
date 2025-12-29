import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsYear(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isYear',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            return false;
          }
          // Defina aqui a sua lógica de ano válido
          return value >= 1900 && value <= new Date().getFullYear() + 1;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid year (e.g., between 1900 and ${new Date().getFullYear() + 1}).`;
        },
      },
    });
  };
}
