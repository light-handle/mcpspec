export interface BackoffConfig {
  initial: number;
  multiplier: number;
  max: number;
}

export const DEFAULT_BACKOFF: BackoffConfig = {
  initial: 1000,
  multiplier: 2,
  max: 30000,
};

export function calculateBackoff(attempt: number, config: BackoffConfig = DEFAULT_BACKOFF): number {
  const delay = config.initial * Math.pow(config.multiplier, attempt);
  return Math.min(delay, config.max);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
