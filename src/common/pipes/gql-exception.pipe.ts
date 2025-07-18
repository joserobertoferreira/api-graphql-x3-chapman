import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch(HttpException) // 1. Só captura exceções do tipo HttpException
export class GqlHttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): any {
    const status = exception.getStatus();
    const response = exception.getResponse();

    let message: string;
    let validationErrors: any[] | undefined;

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const resObj = response as { message: string; error?: string; errors?: any[] };
      message = resObj.message;
      validationErrors = resObj.errors; // Pegamos nosso array customizado
    } else {
      message = 'An unexpected error occurred';
    }

    return new GraphQLError(message, {
      extensions: {
        code: HttpException.name, // Ou `exception.constructor.name`
        status: status,
        // Anexar array de erros se ele existir
        ...(validationErrors && { validationErrors: validationErrors }),
      },
    });
  }
}
