import { ArgumentsHost, BadRequestException, Catch, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * Global GraphQL Exception Filter
 * Captures ALL exceptions (HttpException, UserInputError, BadRequestException, etc.)
 * and converts them to properly formatted GraphQL errors
 */
@Catch() // Capture all exceptions
export class GqlHttpExceptionFilter implements GqlExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch(exception: unknown, _host: ArgumentsHost): GraphQLError {
    console.error('Exception caught by filter:', exception);

    // ==================================================
    // 1. GraphQLError (include UserInputError)
    // ==================================================
    if (exception instanceof GraphQLError) {
      console.log('GraphQLError detected - returning as-is');

      // Already is GraphQLError, returning as-is
      // (includes UserInputError from @nestjs/apollo)
      return exception;
    }

    // ==================================================
    // 2. HttpException (BadRequestException, etc.)
    // ==================================================
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      console.log(`HttpException detected - status: ${status}`);

      // Validation errors from ValidationPipe
      if (exception instanceof BadRequestException && Array.isArray(response['message'])) {
        console.log('Validation errors detected');

        return new GraphQLError('Input validation failed', {
          extensions: {
            code: 'BAD_REQUEST',
            status: status,
            validationErrors: response['message'],
          },
        });
      }

      // Generic HttpException
      let message: string;
      let validationErrors: any[] | undefined;

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null && 'message' in response) {
        const resObj = response as { message: string; error?: string; errors?: any[] };
        message = resObj.message;
        validationErrors = resObj.errors;
      } else {
        message = 'An unexpected error occurred';
      }

      return new GraphQLError(message, {
        extensions: {
          code: exception.constructor.name,
          status: status,
          ...(validationErrors && { validationErrors }),
        },
      });
    }

    // ==================================================
    // 3. Unknown errors (generic Error, etc.)
    // ==================================================
    console.error('Unknown exception type:', exception);

    const message = exception instanceof Error ? exception.message : 'An unexpected error occurred';
    return new GraphQLError(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        originalError: exception instanceof Error ? exception.name : 'UnknownError',
      },
    });
  }
}
