import { ReconnectStrategy } from "./types";
export declare class FixedDelayStrategy implements ReconnectStrategy {
    private delayMs;
    private maxAttempts;
    constructor(delayMs: number, maxAttempts?: number);
    nextDelay(_attempt: number): number;
    shouldRetry(attempt: number): boolean;
}
export declare class ExponentialBackoffStrategy implements ReconnectStrategy {
    private initialDelayMs;
    private multiplier;
    private maxAttempts;
    constructor(initialDelayMs: number, multiplier?: number, maxAttempts?: number);
    nextDelay(attempt: number): number;
    shouldRetry(attempt: number): boolean;
}
