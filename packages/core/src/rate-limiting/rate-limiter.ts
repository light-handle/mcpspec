import Bottleneck from 'bottleneck';
import type { RateLimitConfig } from '@mcpspec/shared';
import { DEFAULT_RATE_LIMIT } from '@mcpspec/shared';

export class RateLimiter {
  private limiter: Bottleneck;
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT, ...config };
    this.limiter = new Bottleneck({
      maxConcurrent: this.config.maxConcurrent,
      minTime: Math.ceil(1000 / this.config.maxCallsPerSecond),
    });
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }

  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  async stop(): Promise<void> {
    await this.limiter.stop();
  }
}
