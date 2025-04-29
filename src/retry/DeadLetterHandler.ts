import { Channel } from "amqplib";
import { RetryInfrastructureOptions } from "./types";

export class DeadLetterHandler {
  static async setupRetryInfrastructure(
    channel: Channel,
    {
      mainExchange,
      mainExchangeType,
      mainQueue,
      routingKey,
      retryExchange,
      retryQueuePrefix,
      parkingLotQueue,
      maxAttempts,
      backoffInitial,
      backoffMultiplier,
      backoffMax,
    }: RetryInfrastructureOptions
  ) {
    await channel.assertExchange(retryExchange, "direct", { durable: true });
    await channel.assertQueue(parkingLotQueue, { durable: true });
    await channel.bindQueue(
      parkingLotQueue,
      retryExchange,
      `${routingKey}.parkinglot`
    );

    await channel.assertExchange(mainExchange, mainExchangeType, {
      durable: true,
    });
    await channel.assertQueue(mainQueue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": retryExchange,
        "x-dead-letter-routing-key": routingKey,
      },
    });
    await channel.bindQueue(mainQueue, mainExchange, routingKey);

    let delay = backoffInitial;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const ttl = Math.min(delay, backoffMax);
      const retryQueue = `${retryQueuePrefix}.${ttl}`;
      await channel.assertQueue(retryQueue, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": mainExchange,
          "x-dead-letter-routing-key": routingKey,
          "x-message-ttl": ttl,
        },
      });
      await channel.bindQueue(
        retryQueue,
        retryExchange,
        `${routingKey}.retry.${ttl}`
      );
      delay *= backoffMultiplier;
    }
  }

  static async sendToRetryQueue(
    channel: Channel,
    retryExchange: string,
    routingKey: string,
    message: Buffer,
    headers: any,
    ttl: number
  ) {
    const retryRoutingKey = `${routingKey}.retry.${ttl}`;
    channel.publish(retryExchange, retryRoutingKey, message, {
      persistent: true,
      headers,
    });
  }

  static async sendToParkingLot(
    channel: Channel,
    retryExchange: string,
    routingKey: string,
    message: Buffer,
    headers: any
  ) {
    const parkingRoutingKey = `${routingKey}.parkinglot`;
    channel.publish(retryExchange, parkingRoutingKey, message, {
      persistent: true,
      headers,
    });
  }
}
