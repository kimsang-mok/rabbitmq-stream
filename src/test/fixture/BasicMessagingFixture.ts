import "reflect-metadata";

import { Consumer, Publisher } from "binding/binder";
import { MessagingService } from "messaging-registry/decorators";
import { EventEmitter } from "events";

@MessagingService()
export class BasicMessagingFixture {
  private emitter = new EventEmitter();

  @Publisher("testPublisher")
  async publishTestMessage(data: { id: string }) {
    return { data };
  }

  @Consumer("testConsumer")
  async consumeWithTestMessage(data: any) {
    this.emitter.emit("message", data);
  }

  onMessage(cb: (data: any) => void) {
    this.emitter.on("message", cb);
  }
}
