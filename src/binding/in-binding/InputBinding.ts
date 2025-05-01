import amqp from "amqplib";
import { InputBindingOptions, MessageHandler } from "./types";
import { ChannelManager } from "connection/ChannelManager";
import { ChannelType } from "connection/types";
import { RetryManager } from "retry/RetryManager";
import { LoggerFactory } from "logging/LoggerFactory";
import { RetryManagerFactory } from "retry/RetryManagerFactory";

export class InputBinding {
  private logger = LoggerFactory.createDefaultLogger(InputBinding.name);

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
    const {
      queue,
      exchange,
      exchangeType,
      exchangeArguments,
      routingKey,
      prefetch,
      retry,
    } = this.options;

    if (exchange) {
      await this.channel.assertExchange(exchange, exchangeType || "topic", {
        durable: true,
        arguments: exchangeArguments,
      });
      const bindKey = routingKey || "";

      if (!retry) {
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, exchange, bindKey);
      }
    }
    if (prefetch) {
      await this.channel.prefetch(prefetch);
    }

    if (retry) {
      this.retryManager = await RetryManagerFactory.create(
        this.channel,
        this.options
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
          this.logger.error(`Handler error (no retry configured): ${error}`);
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
