import { Options } from "amqplib";
import { ExchangeOptions } from "types";

export interface OutputBindingOptions {
  exchange: string;
  defaultRoutingKey?: string;
  exchangeType?: ExchangeOptions["type"];
  delay?: {
    strategy?: "ttl" | "plugin";
    delayMs?: number;
    xDelayedType?: ExchangeOptions["type"];
  };
}

export type PublisherReturnType<TPayload> = Promise<
  | TPayload
  | {
      data: TPayload;
      messageOptions?: Options.Publish & {
        delayMs?: number;
      };
    }
>;
