import { Injectable } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  private readonly windows = new Map<string, number[]>();

  /**
   * Check if a request is allowed under the sliding window rate limit.
   * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number = 60_000,
  ): { allowed: true } | { allowed: false; retryAfter: number } {
    const now = Date.now();
    const cutoff = now - windowMs;

    let timestamps = this.windows.get(identifier) || [];
    // Remove expired timestamps
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
      this.windows.set(identifier, timestamps);
      return { allowed: false, retryAfter };
    }

    timestamps.push(now);
    this.windows.set(identifier, timestamps);
    return { allowed: true };
  }
}
