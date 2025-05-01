import { ExponentialBackoffStrategy } from "./RetryStrategy";
import { RetryManager } from "./RetryManager";
import { FixedRetryStrategy } from "./RetryStrategy";
import { InputBindingOptions } from "binding/in-binding";
import { Channel } from "amqplib";
import { DeadLetterHandler } from "./DeadLetterHandler";

export class RetryManagerFactory {
  static async create(
    channel: Channel,
    options: InputBindingOptions
  ): Promise<RetryManager> {
    const retry = options.retry!;
    const { queue, exchange, exchangeType, routingKey } = options;

    const retryExchange = retry.retryExchange || `${exchange}.retry`;
    const retryQueuePrefix = retry.retryQueuePrefix || `${queue}.retry`;
    const parkingLotQueue = retry.parkingLotQueue || `${queue}.parkinglot`;

    await DeadLetterHandler.setupRetryInfrastructure(channel, {
      mainExchange: exchange!,
      mainExchangeType: exchangeType || "topic",
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

    const strategy =
      retry.strategy === "fixed"
        ? new FixedRetryStrategy(
            retry.maxAttempts ?? 3,
            retry.backoffInitial ?? 500
          )
        : new ExponentialBackoffStrategy(
            retry.maxAttempts ?? 5,
            retry.backoffInitial ?? 1000,
            retry.backoffMultiplier ?? 2,
            retry.backoffMax ?? 30000
          );

    return new RetryManager(
      channel,
      {
        mainExchange: exchange!,
        mainQueue: queue,
        routingKey: routingKey || "",
        retryExchange,
        retryQueuePrefix,
        parkingLotQueue,
      },
      strategy
    );
  }
}
