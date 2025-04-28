import amqp from "amqplib";

import { OutputBindingOptions } from "./types";
import { ChannelManager } from "connection/ChannelManager";
import { ChannelType } from "connection/types";

export class OutputBinding {
  private channel: amqp.Channel | undefined;
  options: OutputBindingOptions;

  constructor(
    private channelManager: ChannelManager,
    options: OutputBindingOptions
  ) {
    this.options = options;
  }

  /** initialize the channel and declare the exchange (if not already declared). */
  async init(): Promise<void> {
    this.channel = await this.channelManager.getChannel(ChannelType.Publisher);
    const { exchange, exchangeType } = this.options;
    await this.channel.assertExchange(exchange, exchangeType || "topic", {
      durable: true,
    });
  }

  /** publish a message to the exchange, using default routing key if none is provided. */
  async publish(message: any, routingKey?: string): Promise<void> {
    if (!this.channel) {
      await this.init();
    }

    const { exchange, defaultRoutingKey } = this.options;
    const key = routingKey || defaultRoutingKey || "";

    let content: Buffer;
    if (Buffer.isBuffer(message)) {
      content = message;
    } else if (typeof message === "string") {
      content = Buffer.from(message);
    } else {
      content = Buffer.from(JSON.stringify(message));
    }

    this.channel!.publish(exchange, key, content, { persistent: true });
  }
}
