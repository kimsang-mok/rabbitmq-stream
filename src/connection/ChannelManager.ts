import { Channel, ConfirmChannel } from "amqplib";
import { ChannelType } from "./types";
import { ConnectionManager } from "./ConnectionManager";

/**
 * ChannelManager manages consumer and publisher channels with lazy creation.
 */
export class ChannelManager {
  private consumerChannel: Channel | null = null;
  private publisherChannel: ConfirmChannel | null = null;

  constructor(private connectionManager: ConnectionManager) {
    this.connectionManager.on("connected", () => this.resetChannels());
    this.connectionManager.on("disconnected", () => this.resetChannels());
  }

  private resetChannels() {
    this.consumerChannel = null;
    this.publisherChannel = null;
  }

  async getChannel(type: ChannelType): Promise<Channel | ConfirmChannel> {
    if (type === ChannelType.Consumer) {
      return this.getConsumerChannel();
    }

    if (type === ChannelType.Publisher) {
      return this.getPublisherChannel();
    }

    throw new Error(`Unknown channel type: ${type}`);
  }

  private async getConsumerChannel(): Promise<Channel> {
    if (!this.consumerChannel) {
      const connection = await this.connectionManager.getConnection();
      this.consumerChannel = await connection.createChannel();
    }
    return this.consumerChannel;
  }

  private async getPublisherChannel(): Promise<ConfirmChannel> {
    if (!this.publisherChannel) {
      const connection = await this.connectionManager.getConnection();
      this.publisherChannel = await connection.createConfirmChannel();
    }
    return this.publisherChannel;
  }
}
