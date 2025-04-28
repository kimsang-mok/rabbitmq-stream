import amqp from "amqplib";
import { InputBindingOptions, MessageHandler } from "./types";
import { ChannelManager } from "connection/ChannelManager";
import { ChannelType } from "connection/types";
import { RetryManager } from "binding/retry/RetryManager";
import { DeadLetterHandler } from "binding/retry/DeadLetterHandler";
import { RetryStrategy } from "binding/retry/types";
import {
  FixedRetryStrategy,
  ExponentialBackoffStrategy,
} from "binding/retry/RetryStrategy";

export class InputBinding {
  private channel: amqp.Channel | undefined;
  private consumerTag?: string;
  private handler?: MessageHandler;

  private retryManager?: RetryManager;
  options: InputBindingOptions;

  constructor(
    private channelManager: ChannelManager,
    options: InputBindingOptions
  ) {
    this.options = options;
  }

  async init(): Promise<void> {
    this.channel = await this.channelManager.getChannel(ChannelType.Consumer);
    const { queue, exchange, routingKey, prefetch, retry } = this.options;

    if (exchange) {
      await this.channel.assertExchange(exchange, "topic", { durable: true });
      const bindKey = routingKey || "";
      await this.channel.bindQueue(queue, exchange, bindKey);
    }
    if (prefetch) {
      await this.channel.prefetch(prefetch);
    }

    if (retry) {
      const retryExchange = retry.retryExchange || `${exchange}.retry`;
      const retryQueuePrefix = retry.retryQueuePrefix || `${queue}.retry`;
      const parkingLotQueue = retry.parkingLotQueue || `${queue}.parkinglot`;

      await DeadLetterHandler.setupRetryInfrastructure(this.channel, {
        mainExchange: exchange!,
        mainQueue: queue,
        routingKey: routingKey || "",
        retryExchange,
        retryQueuePrefix,
        parkingLotQueue,
        maxAttempts: retry.maxAttempts ?? 3,
        backoffInitial: retry.backoffInitial ?? 500,
        backoffMultiplier: retry.backoffMultiplier ?? 2,
        backoffMax: retry.backoffMax ?? 10000,
      });

      let retryStrategy: RetryStrategy;
      if (retry.strategy === "fixed") {
        retryStrategy = new FixedRetryStrategy(
          retry.maxAttempts ?? 3,
          retry.backoffInitial ?? 500
        );
      } else if (retry.strategy === "exponential") {
        retryStrategy = new ExponentialBackoffStrategy(
          retry.maxAttempts ?? 5,
          retry.backoffInitial ?? 1000,
          retry.backoffMultiplier ?? 2,
          retry.backoffMax ?? 30000
        );
      } else {
        retryStrategy = new FixedRetryStrategy(3, 5000); // fallback default
      }
      this.retryManager = new RetryManager(
        this.channel,
        {
          mainExchange: exchange!,
          mainQueue: queue,
          routingKey: routingKey || "",
          retryExchange,
          retryQueuePrefix,
          parkingLotQueue,
        },
        retryStrategy
      );
    }
  }

  /** set the message handler callback for processing incoming message. */
  setHandler(handler: MessageHandler): void {
    this.handler = handler;
  }

  /** start consuming messages from the queue */
  async start(): Promise<void> {
    if (!this.handler) {
      throw new Error("No message handler set for InputBinding");
    }

    if (!this.channel) {
      await this.init();
    }

    // start consuming: save consumerTag to allow cancellation
    const { queue } = this.options;
    const consumeInfo = await this.channel!.consume(queue, async (msg) => {
      if (msg === null) return;
      try {
        const content = this.parseMessageContent(msg);

        // invoke user handler
        await Promise.resolve(this.handler!(content, msg));

        this.channel!.ack(msg);
      } catch (error) {
        // on error, do not ack yet — delegate to retryManager or dead-letter handling
        if (this.retryManager) {
          await this.retryManager.handleRetry(msg, error);
        } else {
          console.error(
            "[InputBinding] Handler error (no retry configured):",
            error
          );
          this.channel!.reject(msg, false); // no retry, send to DLX if DLX exists
        }
      }
    });

    this.consumerTag = consumeInfo.consumerTag;
  }

  async stop(): Promise<void> {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
      this.consumerTag = undefined;
    }
  }

  private parseMessageContent(msg: amqp.Message): any {
    const contentBuffer = msg.content;
    try {
      return JSON.parse(contentBuffer.toString());
    } catch {
      return contentBuffer;
    }
  }
}
