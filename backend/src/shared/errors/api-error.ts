/**
 * Domain error that maps directly to an HTTP status code.
 * Throw these in services; the error middleware turns them into JSON responses.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Unauthorized', code?: string): ApiError {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code?: string): ApiError {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Not found', code?: string): ApiError {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code?: string): ApiError {
    return new ApiError(409, message, code);
  }

  static internal(message = 'Internal server error', code?: string): ApiError {
    return new ApiError(500, message, code);
  }
}