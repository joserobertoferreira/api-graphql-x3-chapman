import { ArgumentMetadata, BadRequestException, Injectable, ValidationPipe } from '@nestjs/common';

@Injectable()
export class LoggingValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      skipMissingProperties: true,
      validateCustomDecorators: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value,
        }));
        console.error('Validation errors:', formattedErrors);
        return new BadRequestException({
          message: 'Validation failed',
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
// import { ArgumentMetadata, Injectable, PipeTransform, ValidationPipe } from '@nestjs/common';

// @Injectable()
// export class LoggingValidationPipe extends ValidationPipe implements PipeTransform {
//   async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
//     const { metatype } = metadata;

//     // --- NOSSO DEBUGGER ---
//     console.log('--- LoggingValidationPipe: Iniciando a Validação ---');
//     console.log(`Metatype recebido:`, metatype ? metatype.name : 'N/A');
//     console.log('Valor recebido (antes da transformação):', JSON.stringify(value, null, 2));
//     // ----------------------

//     if (!metatype || !this.toValidate(metadata)) {
//       return value;
//     }

//     try {
//       // Chama a lógica de transformação e validação do ValidationPipe original
//       return await super.transform(value, metadata);
//     } catch (error) {
//       console.error(
//         '--- LoggingValidationPipe: Erro durante a validação ---',
//         error.getResponse ? error.getResponse() : error,
//       );
//       throw error;
//     }
//   }

//   protected toValidate(metadata: ArgumentMetadata): boolean {
//     const { metatype } = metadata;
//     if (!metatype) {
//       return false;
//     }
//     const types: Function[] = [String, Boolean, Number, Array, Object];
//     return !types.includes(metatype);
//   }
// }
