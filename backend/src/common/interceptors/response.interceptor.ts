import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../response.interface';
import { PaginatedResult } from '../paginated-result.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        // Skip wrapping if already wrapped
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'statusCode' in data
        ) {
          return data;
        }

        // Handle PaginatedResult
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'page' in data &&
          'total' in data
        ) {
          const paginated = data as PaginatedResult<any>;
          const totalPage = Math.ceil(paginated.total / paginated.limit);
          return {
            success: true,
            statusCode,
            message: 'Success',
            data: paginated.data,
            meta: {
              page: paginated.page,
              limit: paginated.limit,
              total: paginated.total,
              totalPage,
            },
          };
        }

        // Handle plain responses
        return {
          success: true,
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
