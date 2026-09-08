/** Central tuning knobs so pipeline behaviour is documented in one place. */

export const RETRIEVAL = {
  /** Max pages fetched per company crawl (homepage + discovered links). */
  MAX_PAGES: 6,
  /** Max BFS depth from the homepage. */
  MAX_DEPTH: 2,
  /** Max links considered per page before ranking. */
  MAX_LINKS_PER_PAGE: 80,
  /** Per-request timeout, ms. */
  FETCH_TIMEOUT_MS: 8000,
  /** Max response body size accepted, bytes. */
  MAX_BODY_BYTES: 2 * 1024 * 1024,
  /** Delay between requests to the same host, ms (politeness / rate limiting). */
  PER_HOST_DELAY_MS: 400,
  ALLOWED_CONTENT_TYPES: ["text/html", "text/plain", "application/xhtml+xml"],
};

export const COVERAGE = {
  /** Total coverage passes including the first draft (Section 4: "decide how many and when to stop"). */
  MAX_PASSES: 3,
};

export const SCHEDULE = {
  /** Minutes budgeted per question by difficulty (1..3), used by the deterministic allocator. */
  MINUTES_BY_DIFFICULTY: { 1: 15, 2: 25, 3: 40 } as Record<number, number>,
  MIN_DAYS: 1,
  MAX_DAYS: 60,
};

export const LLM = {
  MAX_RETRIES: 6,
  BASE_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
};
