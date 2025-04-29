import { Channel } from "amqplib";

export interface DelayStrategy {
  setup(channel: Channel): Promise<void>;
  publish(
    channel: Channel,
    message: Buffer,
    exchange: string,
    routingKey: string,
    delayMs?: number
  ): void;
}

export type DelayConfig = {
  strategy: "ttl" | "plugin";
  delayMs?: number;
  targetQueue?: string;
  exchange?: string;
  exchangeType?: string;
};

export type DelayManagerConfig = {
  strategy: "ttl" | "plugin";
  delayMs?: number;
  targetQueue?: string;
  exchange: string;
  exchangeType?: ExchangeOptions["type"];
  xDelayedType?: ExchangeOptions["type"];
};
