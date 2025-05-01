import amqp, { Options } from "amqplib";

import { OutputBindingOptions } from "./types";
import { ChannelManager } from "connection/ChannelManager";
import { ChannelType } from "connection/types";
import { DelayStrategy } from "delay/types";
import { DelayManager } from "delay/DelayManager";
import { LoggerFactory } from "logging/LoggerFactory";

export class OutputBinding {
  private channel: amqp.Channel | undefined;
  private delayStrategy?: DelayStrategy;
  options: OutputBindingOptions;
  private logger = LoggerFactory.createDefaultLogger(OutputBinding.name);

  constructor(
    private channelManager: ChannelManager,
    options: OutputBindingOptions
  ) {
    this.options = options;

    this.channelManager["connectionManager"].on("connected", async () => {
      try {
        this.channel = undefined;
        this.logger.warn("Reinitializing OutputBinding after reconnect");
        await this.init();
      } catch (err: any) {
        this.logger.error("Reinitialization of OutputBinding failed: ", err);
      }
    });
  }

  /** initialize the channel and declare the exchange (if not already declared). */
  async init(): Promise<void> {
    this.channel = await this.channelManager.getChannel(ChannelType.Publisher);

    if (this.options.delay?.strategy) {
      // internally build the strategy using DelayManager
      this.delayStrategy = DelayManager.createStrategy({
        strategy: this.options.delay.strategy,
        delayMs: this.options.delay.delayMs,
        targetQueue: this.options.defaultRoutingKey, // used by TTL strategy
        exchange: this.options.exchange,
        exchangeType: this.options.exchangeType,
        xDelayedType: this.options.delay.xDelayedType,
      });

      await this.delayStrategy.setup(this.channel);
    } else {
      await this.channel.assertExchange(
        this.options.exchange,
        this.options.exchangeType || "topic",
        { durable: true }
      );
    }
  }

  /** publish a message to the exchange, using default routing key if none is provided. */
  async publish(
    message: any,
    routingKey?: string,
    options?: Options.Publish
  ): Promise<void> {
    await this.publishWithDelay(message, undefined, routingKey, options);
  }

  async publishDelayed(
    message: any,
    delayMs: number,
    routingKey?: string,
    options?: Options.Publish
  ): Promise<void> {
    await this.publishWithDelay(message, delayMs, routingKey, options);
  }

  private async publishWithDelay(
    message: any,
    delayMs?: number,
    routingKey?: string,
    options?: Options.Publish
  ): Promise<void> {
    const key = routingKey || this.options.defaultRoutingKey || "";
    const content = Buffer.isBuffer(message)
      ? message
      : Buffer.from(
          typeof message === "string" ? message : JSON.stringify(message)
        );

    if (this.delayStrategy && delayMs != null) {
      this.delayStrategy.publish(
        this.channel!,
        content,
        this.options.exchange,
        key,
        delayMs,
        options
      );
    } else {
      this.channel!.publish(this.options.exchange, key, content, {
        persistent: options?.persistent ?? true,
        headers: options?.headers,
        ...options,
      });
    }
  }
}
