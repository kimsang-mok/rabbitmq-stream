import amqp from "amqplib";

export interface InputBindingOptions {
  queue: string;
  exchange?: string;
  exchangeType?: ExchangeOptions["type"];
  exchangeArguments?: ExchangeOptions["arguments"];
  routingKey?: string;
  prefetch?: number; // prefetch count for QoS

  retry?: {
    retryExchange?: string;
    retryQueuePrefix?: string;
    parkingLotQueue?: string;
    maxAttempts?: number;
    backoffInitial?: number;
    backoffMultiplier?: number;
    backoffMax?: number;
    strategy?: "fixed" | "exponential";
  };
}

export type MessageHandler<T = any> = (
  msg: T,
  rawMessage: amqp.Message
) => Promise<void> | void;
