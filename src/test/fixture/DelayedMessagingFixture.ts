import "reflect-metadata";

import { Consumer, Publisher } from "binding/binder";
import { PublisherReturnType } from "binding/out-binding";
import EventEmitter from "events";
import { MessagingService } from "messaging-registry/decorators";

@MessagingService()
export class DelayedMessagingFixture {
  public events = new EventEmitter();

  @Publisher("delayedPublisher")
  async sendDelayedMessage(payload: any): PublisherReturnType<any> {
    return {
      data: payload,
      messageOptions: {
        delayMs: 3000,
        headers: {
          "x-test-id": payload.id,
        },
      },
    };
  }

  @Consumer("delayedConsumer")
  async onReceiveDelayed(payload: any) {
    this.events.emit("received", payload);
  }
}
