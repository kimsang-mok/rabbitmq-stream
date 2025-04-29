export interface RetryStrategy {
  /**
   * compute the delay (ms) before the next retry for the given attempt number (starting at 1).
   * return null if no further retry should be attempted.
   */
  getNextDelay(attempt: number, error: Error): number | null;
}

export interface RetryManagerOptions {
  mainExchange: string;
  mainQueue: string;
  routingKey: string;
  retryExchange: string;
  retryQueuePrefix: string;
  parkingLotQueue: string;
}

export interface RetryInfrastructureOptions {
  mainExchange: string;
  mainExchangeType: string;
  mainQueue: string;
  routingKey: string;
  retryExchange: string;
  retryQueuePrefix: string;
  parkingLotQueue: string;
  maxAttempts: number;
  backoffInitial: number;
  backoffMultiplier: number;
  backoffMax: number;
}
