export const successResponse = <T>(
  data: T,
  message?: string
) => ({
  success: true as const,
  message,
  data
});

export const errorResponse = (
  code: string,
  message: string,
  details?: unknown
) => ({
  success: false as const,
  error: {
    code,
    message,
    details
  }
});