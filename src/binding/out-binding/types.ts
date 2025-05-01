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
