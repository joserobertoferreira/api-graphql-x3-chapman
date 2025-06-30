import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsMutuallyExclusiveConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // `args.constraints` conterá a lista de outras propriedades
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // A validação passa se:
    // a) Esta propriedade (value) não foi fornecida, OU
    // b) A outra propriedade (relatedValue) não foi fornecida.
    // A validação falha se AMBAS foram fornecidas.
    if (value !== undefined && relatedValue !== undefined) {
      return false; // Falha na validação
    }

    return true; // Passa na validação
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `Properties ${args.property} and ${relatedPropertyName} are mutually exclusive. Please provide only one.`;
  }
}

// 2. Decorador para utilizar nas classes
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
