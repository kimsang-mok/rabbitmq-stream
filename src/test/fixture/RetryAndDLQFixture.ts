import "reflect-metadata";

import { Consumer, Publisher } from "binding/binder";
import { MessagingService } from "messaging-registry/decorators";
import { EventEmitter } from "events";

@MessagingService()
export class RetryAndDLQFixture {
  public events = new EventEmitter();

  @Consumer("retryTestConsumer")
  async failAways(payload: any) {
    this.events.emit("attempt", payload);
    throw new Error("Simulated failure");
  }

  @Consumer("dlqConsumer")
  async handleDLQ(payload: any) {
    this.events.emit("dlq", payload);
  }

  @Publisher("testPublisher")
  async publishMessage(payload: any) {
    return { data: payload };
  }
}
