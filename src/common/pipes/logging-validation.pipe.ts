import { ArgumentMetadata, BadRequestException, Injectable, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class LoggingValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      skipMissingProperties: true,
      validateCustomDecorators: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const formattedErrors = validationErrors.map((error) => ({
          field: error.property,
          // `constraints` é um objeto com as mensagens de erro de cada validador que falhou.
          // Ex: { isNotEmpty: 'name should not be empty', minLength: '...' }
          message: Object.values(error.constraints || {}).join(', '),
        }));

        console.error('--- Validation Errors From Factory ---', formattedErrors);

        return new BadRequestException({
          message: 'Input validation failed',
          errors: formattedErrors,
        });
      },
    });
  }

  public async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.metatype) {
      return value;
    }

    console.log('Validating:', {
      type: metadata.type,
      metatype: metadata.metatype.name,
      value,
    });

    return super.transform(value, metadata);
  }
}
