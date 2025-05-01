import { Channel, Options } from "amqplib";
import { ExchangeOptions } from "types";

export interface DelayStrategy {
  setup(channel: Channel): Promise<void>;
  publish(
    channel: Channel,
    message: Buffer,
    exchange: string,
    routingKey: string,
    delayMs?: number,
    options?: Options.Publish
  ): void;
}

export type DelayConfig = {
  strategy: "ttl" | "plugin";
  delayMs?: number;
  targetQueue?: string;
  exchange?: string;
  exchangeType?: ExchangeOptions["type"];
};

export type DelayManagerConfig = {
  strategy: "ttl" | "plugin";
  delayMs?: number;
  targetQueue?: string;
  exchange: string;
  exchangeType?: ExchangeOptions["type"];
  xDelayedType?: ExchangeOptions["type"];
};
