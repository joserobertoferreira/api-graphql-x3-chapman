import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

@Injectable()
export class LoggingValidationPipe extends ValidationPipe implements PipeTransform {
  constructor() {
    super({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      skipMissingProperties: true,
      validateCustomDecorators: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        // const formattedErrors = validationErrors.map((error) => ({
        //   field: error.property,
        //   // `constraints` é um objeto com as mensagens de erro de cada validador que falhou.
        //   // Ex: { isNotEmpty: 'name should not be empty', minLength: '...' }
        //   message: Object.values(error.constraints || {}).join(', '),
        // }));

        // Call the recursive function to flatten the errors
        const formattedErrors = flattenValidationErrors(validationErrors);

        console.error('--- Validation Errors From Factory ---', formattedErrors);

        return new BadRequestException({
          message: 'Input validation failed',
          errors: formattedErrors,
        });
      },
    });
  }

  public async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype } = metadata;

    console.log('--- LoggingValidationPipe: Iniciando a Validação ---');
    console.log(`Metatype recebido:`, metatype ? metatype.name : 'N/A');

    if (!metatype || !this.toValidate(metadata)) {
      console.log('Pular a validação (sem metatype ou tipo primitivo).');
      return value;
    }

    try {
      return await super.transform(value, metadata);
    } catch (error) {
      console.error('--- Validating:', {
        type: metadata.type,
        metatype: metatype.name,
        // value,
      });
      console.error('--- LoggingValidationPipe: Erro de Validação Detectado ---', error.getResponse());
      throw error;
    }

    // return super.transform(value, metadata);
  }
}

/**
 * A recursive function to flatten nested validation errors from class-validator.
 * @param errors - The array of ValidationError objects.
 * @param parentProperty - The name of the parent property, used to build nested paths (e.g., "general.brokerEmail").
 * @returns An array of simple error objects { field, message }.
 */
function flattenValidationErrors(
  errors: ValidationError[],
  parentProperty: string = '',
): { field: string; message: string }[] {
  let formattedErrors: { field: string; message: string }[] = [];

  for (const error of errors) {
    const propertyPath = parentProperty ? `${parentProperty}.${error.property}` : error.property;

    // Se houver 'constraints' neste nível, adicione-os.
    if (error.constraints) {
      formattedErrors.push({
        field: propertyPath,
        message: Object.values(error.constraints).join(', '),
      });
    }

    // Se houver 'children', chame a função recursivamente para eles.
    if (error.children && error.children.length > 0) {
      const childErrors = flattenValidationErrors(error.children, propertyPath);
      formattedErrors = formattedErrors.concat(childErrors);
    }
  }

  return formattedErrors;
}
