export function friendlyMessage(status?: number, raw?: string): string {
  if (status === 400) return 'Invalid request. Please check your input and try again.';
  if (status === 401) return 'You are not authorized. Please sign in and retry.';
  if (status === 403) return 'Access denied. You do not have permission to perform this action.';
  if (status === 404) return 'Resource not found. It may have been removed or never existed.';
  if (status === 409) return 'Conflict detected. The data may have changed or already exists.';
  if (status === 422) return 'Validation failed. Please correct the highlighted fields.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status && status >= 500) return 'Server is having trouble. Please try again shortly.';
  if (raw?.toLowerCase().includes('network')) return 'Network error. Please check your connection and retry.';
  return raw || 'Something went wrong. Please try again.';
}
