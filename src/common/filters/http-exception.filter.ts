import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiStatus,
  API_STATUS_MESSAGES,
} from '../constants/api-status.constants';
import { ApiResponseEnvelope } from '../interfaces/api-response.interface';
import { Prisma } from '../../generated/prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = API_STATUS_MESSAGES[ApiStatus.SERVER_ERROR];
    let error: Record<string, string[]> | string | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resBody = exception.getResponse();

      if (typeof resBody === 'string') {
        message = resBody;
        error = null;
      } else if (typeof resBody === 'object' && resBody !== null) {
        const body = resBody as Record<string, any>;

        const isFieldErrorMap = Object.values(body).every(
          (val) =>
            Array.isArray(val) && val.every((v) => typeof v === 'string'),
        );

        if (isFieldErrorMap) {
          error = body as Record<string, string[]>;
          message = API_STATUS_MESSAGES[statusCode] ?? exception.message;
        } else {
          message = body.message ?? exception.message;
          error = body.error ?? null;
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      statusCode = ApiStatus.CONFLICT;
      message = API_STATUS_MESSAGES[ApiStatus.CONFLICT];
      const target = (exception.meta?.target as string[]) || ['field'];
      const fieldName = Array.isArray(target) ? target.join('_') : 'field';
      error = { [fieldName]: ['This value is already in use.'] };
    } else {
      this.logger.error(
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = API_STATUS_MESSAGES[ApiStatus.SERVER_ERROR];
      error = null;
    }

    const responseEnvelope: ApiResponseEnvelope<null> = {
      status_code: statusCode,
      timestamp: new Date().toISOString(),
      message,
      data: null,
      error,
      metadata: null,
    };

    response.status(statusCode).json(responseEnvelope);
  }
}
