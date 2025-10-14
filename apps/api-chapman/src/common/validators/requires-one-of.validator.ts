import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'requiresOneOf', async: false })
export class RequiresOneOfConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // A validação passa se `value` (o campo atual) OU `relatedValue` (o outro campo)
    // estiverem definidos.
    return value !== undefined || relatedValue !== undefined;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `Either ${args.property} or ${relatedPropertyName} must be provided.`;
  }
}
