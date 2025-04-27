import { ReconnectStrategy } from "./types";

/** fixed delay strategy: always returns the same delay interval. */
export class FixedDelayStrategy implements ReconnectStrategy {
  constructor(private readonly delayMs: number = 5000) {} // default 5s
  getDelay(): number {
    return this.delayMs;
  }
}

/** exponential backoff strategy: delay grows exponentially with each attempt. */
export class ExponentialBackoffStrategy implements ReconnectStrategy {
  constructor(
    private readonly initialDelayMs: number = 1000, // base delay, e.g. 1s
    private readonly multiplier: number = 2, // growth factor, e.g. double each time
    private readonly maxDelayMs: number = 30000 // optional max cap, e.g. 30s
  ) {}
  getDelay(attempt: number): number {
    // exponential: initialDelay * (multiplier^(attempt-1))
    const expDelay =
      this.initialDelayMs * Math.pow(this.multiplier, attempt - 1);
    return this.maxDelayMs ? Math.min(expDelay, this.maxDelayMs) : expDelay;
  }
}

/** jittered exponential backoff: adds randomness to the exponential delay. */
export class JitteredExponentialBackoffStrategy extends ExponentialBackoffStrategy {
  getDelay(attempt: number): number {
    const expDelay = super.getDelay(attempt);
    // apply "full jitter": random between 0 and expDelay
    return Math.random() * expDelay;
  }
}
