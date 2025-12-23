import { ArgumentsHost, BadRequestException, Catch, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch(HttpException) // Only get HttpException
export class GqlHttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): any {
    const status = exception.getStatus();
    const response = exception.getResponse();

    // Check if is a validation error from the ValidationPipe
    // The ValidationPipe throws a BadRequestException and puts the errors in 'response.message'
    if (exception instanceof BadRequestException && Array.isArray(response['message'])) {
      // 'response.message' it is an array of ValidationError
      // const validationErrors = response['message'] as ValidationError[];

      // Create and return a specific GraphQLError for validation
      return new GraphQLError('Input validation failed', {
        extensions: {
          code: 'BAD_REQUEST', // Use a more semantic code
          status: status,
          // validationErrors: formattedErrors, // Attach the flattened errors
          validationErrors: response, // Attach the flattened errors
        },
      });
    }

    let message: string;
    let validationErrors: any[] | undefined;

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null && 'message' in response) {
      const resObj = response as { message: string; error?: string; errors?: any[] };
      message = resObj.message;
      validationErrors = resObj.errors; // Pegamos nosso array customizado
    } else {
      message = 'An unexpected error occurred';
    }

    return new GraphQLError(message, {
      extensions: {
        code: HttpException.name, // Or `exception.constructor.name`
        status: status,
        // Attach the array of errors if it exists
        ...(validationErrors && { validationErrors: validationErrors }),
      },
    });
  }
}
