import { RetryStrategy } from "./types";

export class FixedRetryStrategy implements RetryStrategy {
  constructor(private maxAttempts: number, private delayMs: number) {}

  getNextDelay(attempt: number, error: Error): number | null {
    return attempt < this.maxAttempts ? this.delayMs : null;
  }
}

export class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(
    private maxAttempts: number,
    private initialDelayMs: number = 1000,
    private multiplier: number = 2,
    private maxDelayMs: number = 30000
  ) {}

  getNextDelay(attempt: number): number | null {
    if (attempt >= this.maxAttempts) return null;
    const delay = this.initialDelayMs * Math.pow(this.multiplier, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }
}

export class NoRetryStrategy implements RetryStrategy {
  getNextDelay(attempt: number, error: Error): number | null {
    return null;
  }
}
