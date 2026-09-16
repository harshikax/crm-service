export const ApiStatus = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EXPECTATION_FAILED: 417,
  UNPROCESSABLE_ENTITY: 422,
  FUNCTIONAL_ERROR: 501,
  PERMISSION_ERROR: 502,
  SERVER_ERROR: 500,
} as const;

export type ApiStatusCode = (typeof ApiStatus)[keyof typeof ApiStatus];

export const API_STATUS_MESSAGES: Record<number, string> = {
  [ApiStatus.SUCCESS]: 'Success',
  [ApiStatus.CREATED]: 'Resource created successfully',
  [ApiStatus.NO_CONTENT]: 'No content',
  [ApiStatus.BAD_REQUEST]: 'Bad request',
  [ApiStatus.UNAUTHORIZED]: 'Unauthorized access',
  [ApiStatus.FORBIDDEN]: 'Forbidden access',
  [ApiStatus.NOT_FOUND]: 'Resource not found',
  [ApiStatus.CONFLICT]: 'Conflict with current state',
  [ApiStatus.EXPECTATION_FAILED]: 'Expectation failed',
  [ApiStatus.UNPROCESSABLE_ENTITY]: 'Validation failed',
  [ApiStatus.FUNCTIONAL_ERROR]: 'Functional error',
  [ApiStatus.PERMISSION_ERROR]: 'Permission error',
  [ApiStatus.SERVER_ERROR]: 'Internal server error',
};
