"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExponentialBackoffStrategy = exports.FixedDelayStrategy = void 0;
class FixedDelayStrategy {
    constructor(delayMs, maxAttempts = Infinity) {
        this.delayMs = delayMs;
        this.maxAttempts = maxAttempts;
    }
    nextDelay(_attempt) {
        return this.delayMs;
    }
    shouldRetry(attempt) {
        return attempt <= this.maxAttempts;
    }
}
exports.FixedDelayStrategy = FixedDelayStrategy;
class ExponentialBackoffStrategy {
    constructor(initialDelayMs, multiplier = 2, maxAttempts = 10) {
        this.initialDelayMs = initialDelayMs;
        this.multiplier = multiplier;
        this.maxAttempts = maxAttempts;
    }
    nextDelay(attempt) {
        return this.initialDelayMs * Math.pow(this.multiplier, attempt - 1);
    }
    shouldRetry(attempt) {
        return attempt <= this.maxAttempts;
    }
}
exports.ExponentialBackoffStrategy = ExponentialBackoffStrategy;
