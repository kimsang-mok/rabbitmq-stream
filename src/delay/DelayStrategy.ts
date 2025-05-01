import { Channel, Options } from "amqplib";
import { DelayStrategy } from "./types";

export class TTLDelayStrategy implements DelayStrategy {
  constructor(
    private targetQueue: string,
    private delayMs: number,
    private delayQueueName = `${targetQueue}.delay.${delayMs}`
  ) {}

  async setup(channel: Channel): Promise<void> {
    await channel.assertQueue(this.delayQueueName, {
      durable: true,
      arguments: {
        "x-message-ttl": this.delayMs,
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": this.targetQueue,
      },
    });
  }

  publish(
    channel: Channel,
    message: Buffer,
    _exchange: string,
    _routingKey: string,
    _delayMs?: number,
    options?: Options.Publish
  ): void {
    channel.sendToQueue(this.delayQueueName, message, {
      ...options,
      persistent: options?.persistent ?? true,
      headers: options?.headers,
    });
  }
}

export class XDelayedPluginStrategy implements DelayStrategy {
  constructor(
    private exchange: string,
    private exchangeType: string = "x-delayed-message",
    private xDelayedType: string = "topic"
  ) {}

  async setup(channel: Channel): Promise<void> {
    await channel.assertExchange(
      this.exchange,
      this.exchangeType || "x-delayed-message",
      {
        durable: true,
        arguments: {
          "x-delayed-type": this.xDelayedType,
        },
      }
    );
  }

  publish(
    channel: Channel,
    message: Buffer,
    exchange: string,
    routingKey: string,
    delayMs = 0,
    options?: Options.Publish
  ): void {
    channel.publish(exchange, routingKey, message, {
      ...options,
      persistent: options?.persistent ?? true,
      headers: {
        ...(options?.headers || {}),
        "x-delay": delayMs,
      },
    });
  }
}
