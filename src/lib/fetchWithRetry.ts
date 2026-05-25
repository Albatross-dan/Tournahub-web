export async function fetchWithRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  retries = 3,
  delayMs = 1000
): Promise<{ data: T | null; error: any }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (!navigator.onLine) {
      // No point retrying while offline
      return { data: null, error: new Error('No internet connection') };
    }

    const result = await fn();

    if (!result.error) return result;

    const isNetworkError =
      result.error.message?.includes('fetch') ||
      result.error.message?.includes('network') ||
      result.error.message?.includes('Failed to fetch') ||
      result.error.code === 'NETWORK_ERROR';

    if (isNetworkError && attempt < retries - 1) {
      // Wait before retrying, doubling the delay each time
      await new Promise(resolve => 
        setTimeout(resolve, delayMs * Math.pow(2, attempt))
      );
      continue;
    }

    return result;
  }

  return { data: null, error: new Error('Max retries reached') };
}
