/** API response envelope (matches server's TransformInterceptor) */
export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}
