import { registerDecorator, ValidationOptions } from 'class-validator';
import { CompanySiteValidator, CompanyValidator, IsValidSiteArgs } from '../validators/company.validator';

/**
 * Decorator which validates if a company exists.
 * @param validationOptions - Default options from `class-validator`.
 */
export function IsCompanyValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCompanyValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: CompanyValidator,
    });
  };
}

/**
 * Decorator which validates if a site exists and, optionally, if it belongs to a specific company.
 * @param options - Validation options, such as `company`.
 * @param validationOptions - Default options from `class-validator`.
 */
export function IsValidSite(options: IsValidSiteArgs = {}, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSiteValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: CompanySiteValidator,
    });
  };
}
