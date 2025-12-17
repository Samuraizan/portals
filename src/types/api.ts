export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    pages: number;
  };
}

export interface PiSignageAPIResponse<T = unknown> {
  success: boolean;
  stat_message?: string;
  data?: T;
}

