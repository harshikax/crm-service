export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface ApiResponseEnvelope<T = unknown> {
  status_code: number;
  timestamp: string;
  message: string;
  data: T | null;
  error: Record<string, string[]> | string | null;
  pagination?: PaginationMeta | null;
  metadata?: Record<string, unknown> | null;
}
