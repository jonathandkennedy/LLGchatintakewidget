type FetchRetryOptions = {
  /** Max number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 8000) */
  maxDelay?: number;
  /** HTTP status codes that should trigger a retry (default: 429, 500, 502, 503, 504) */
  retryStatuses?: number[];
};

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry for transient failures.
 * Only retries on network errors or specified HTTP status codes.
 * Validation errors (400, 401, 403, 404) are NOT retried.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchRetryOptions,
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 8000;
  const retryStatuses = options?.retryStatuses ?? DEFAULT_RETRY_STATUSES;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      // Don't retry client errors (except 429)
      if (response.ok || !retryStatuses.includes(response.status)) {
        return response;
      }

      // Retryable status code
      lastError = new Error(`HTTP ${response.status}`);

      // Check Retry-After header (from rate limiter)
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter && attempt < maxRetries) {
          const waitMs = Math.min(parseInt(retryAfter, 10) * 1000, maxDelay);
          await sleep(waitMs);
          continue;
        }
      }
    } catch (err) {
      // Network error (offline, DNS failure, etc.)
      lastError = err instanceof Error ? err : new Error("Network error");
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      // Add jitter (±25%) to prevent thundering herd
      const jitter = delay * (0.75 + Math.random() * 0.5);
      await sleep(jitter);
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}
