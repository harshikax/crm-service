import {
  ApiStatus,
  API_STATUS_MESSAGES,
} from '../constants/api-status.constants';
import { ApiResponseEnvelope } from '../interfaces/api-response.interface';

interface MakeReturnOptions<T> {
  statusCode?: number;
  message?: string;
  data?: T | null;
  error?: Record<string, string[]> | string | null;
  metadata?: Record<string, unknown> | null;
}

interface MakePaginationReturnOptions<T> {
  statusCode?: number;
  message?: string;
  data: T[];
  total: number;
  perPage: number;
  currentPage: number;
  metadata?: Record<string, unknown> | null;
}

export function makeReturn<T>({
  statusCode = ApiStatus.SUCCESS,
  message,
  data = null,
  error = null,
  metadata = null,
}: MakeReturnOptions<T> = {}): ApiResponseEnvelope<T> {
  return {
    status_code: statusCode,
    timestamp: new Date().toISOString(),
    message: message ?? API_STATUS_MESSAGES[statusCode] ?? 'Success',
    data,
    error,
    metadata,
  };
}

export function makePaginationReturn<T>({
  statusCode = ApiStatus.SUCCESS,
  message,
  data,
  total,
  perPage,
  currentPage,
  metadata = null,
}: MakePaginationReturnOptions<T>): ApiResponseEnvelope<T[]> {
  const lastPage = Math.ceil(total / perPage) || 1;

  return {
    status_code: statusCode,
    timestamp: new Date().toISOString(),
    message: message ?? API_STATUS_MESSAGES[statusCode] ?? 'Success',
    data,
    error: null,
    pagination: {
      total,
      per_page: perPage,
      current_page: currentPage,
      last_page: lastPage,
    },
    metadata,
  };
}
