import { Options } from "amqplib";

export interface ConnectionManagerOptions {
  uri: string; // AMQP connection URI (amqp://user:pass@host/vhost)
  /** reconnect strategy: can be a preset string, an instance of ReconnectStrategy, or a custom function. */
  reconnectStrategy?:
    | "fixed"
    | "exponential"
    | "jittered"
    | ReconnectStrategy
    | ((attempt: number) => number);
  maxReconnectAttempts?: number;
  /** if using fixed strategy, delay in ms (default 5000). */
  reconnectIntervalMs?: number;
  /** if using exponential/jittered, initial delay in ms (default 1000). */
  initialDelayMs?: number;
  /** if using exponential/jittered, maximum delay in ms (default 30000). */
  maxDelayMs?: number;
  /** if using exponential, multiplier for backoff (default 2). */
  multiplier?: number;
  /** additional amqplib connect options (e.g., heartbeat, etc.) */
  amqpOptions?: Options.Connect;
}

export interface ReconnectStrategy {
  /** compute the delay (ms) before the next reconnect attempt, given the attempt count (starting at 1). */
  getDelay(attempt: number): number;
}

export enum ChannelType {
  Consumer = "consumer",
  Publisher = "publisher",
}
