const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
) {
  const signal = AbortSignal.timeout(timeoutMs);
  return await fetch(input, {
    ...init,
    signal: init.signal ?? signal,
  });
}

export { DEFAULT_FETCH_TIMEOUT_MS };
