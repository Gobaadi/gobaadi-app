import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorSources: { path: string; message: string }[] = [];
    const extraFields: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message =
          typeof resp.message === 'string' && resp.message
            ? resp.message
            : exception.message;

        // Handle class-validator errors (array of messages)
        if (Array.isArray(resp.message)) {
          errorSources = (resp.message as string[]).map((msg) => ({
            path: 'body',
            message: msg,
          }));
          message = 'Validation failed';
        }

        const extra: Record<string, unknown> = { ...resp };
        delete extra.message;
        delete extra.error;
        delete extra.statusCode;
        delete extra.success;
        Object.assign(extraFields, extra);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...extraFields,
      ...(errorSources.length > 0 ? { errorSources } : {}),
    });
  }
}
