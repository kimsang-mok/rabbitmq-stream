import { Channel, Message } from "amqplib";
import { RetryManagerOptions, RetryStrategy } from "./types";
import { DeadLetterHandler } from "./DeadLetterHandler";

export class RetryManager {
  private attemptHeader = "x-attempts";

  constructor(
    private channel: Channel,
    private options: RetryManagerOptions,
    private strategy: RetryStrategy
  ) {}

  async handleRetry(msg: Message, error: any): Promise<void> {
    const attempts = this.getAttemptCount(msg) + 1;
    const delay = this.strategy.getNextDelay(
      attempts,
      error instanceof Error ? error : new Error(String(error))
    );

    if (delay != null) {
      const headers = {
        ...msg.properties.headers,
        [this.attemptHeader]: attempts,
      };
      await DeadLetterHandler.sendToRetryQueue(
        this.channel,
        this.options.retryExchange,
        this.options.routingKey,
        msg.content,
        headers,
        delay
      );
      this.channel.ack(msg);
      console.warn(
        `[RetryManager] Message scheduled for retry #${attempts} after ${delay}ms`
      );
    } else {
      await DeadLetterHandler.sendToParkingLot(
        this.channel,
        this.options.retryExchange,
        this.options.routingKey,
        msg.content,
        msg.properties.headers || {}
      );
      this.channel.ack(msg);
      console.error(
        `[RetryManager] Message moved to parking lot after ${attempts} attempts`
      );
    }
  }

  private getAttemptCount(msg: Message): number {
    return (msg.properties.headers?.[this.attemptHeader] as number) || 0;
  }
}
