import { MessagingApplication } from "application/MessagingApplication";
import { createMessagingContext } from "createMessagingContext";
import { GlobalLogger } from "logging/GlobalLogger";
import { DelayedMessagingFixture } from "test/fixture/DelayedMessagingFixture";
import {
  startRabbitContainer,
  stopRabbitContainer,
} from "test/setup/testContainer";

describe("Delayed Messaging", () => {
  let rabbitUri: string;
  let fixture: DelayedMessagingFixture;

  let context: MessagingApplication;

  beforeAll(async () => {
    const { amqpUri } = await startRabbitContainer();
    rabbitUri = amqpUri;
    fixture = new DelayedMessagingFixture();
    GlobalLogger.initialize();

    context = await createMessagingContext({
      connection: {
        uri: rabbitUri,
      },
      binder: {
        inputs: {
          delayedConsumer: {
            queue: "delayed.queue",
            exchange: "delayed.exchange",
            exchangeType: "x-delayed-message",
            exchangeArguments: {
              "x-delayed-type": "topic",
            },
            routingKey: "delayed.key",
          },
        },
        outputs: {
          delayedPublisher: {
            exchange: "delayed.exchange",
            exchangeType: "x-delayed-message",
            defaultRoutingKey: "delayed.key",
            delay: {
              strategy: "plugin",
              xDelayedType: "topic",
            },
          },
        },
      },
    });
  }, 60000);

  afterAll(async () => {
    await context.stop();
    await stopRabbitContainer();
  });

  it("should delay message delivery by ~3 seconds", async () => {
    const payload = { id: "msg-1", text: "hello" };
    const startTime = Date.now();

    let received: any = null;
    fixture.events.once("received", (data) => {
      received = data;
    });

    await fixture.sendDelayedMessage(payload);

    // wait for max 6s
    const timeout = Date.now() + 6000;
    while (!received && Date.now() < timeout) {
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(received).toEqual(payload);
    const duration = Date.now() - startTime;
    expect(duration).toBeGreaterThanOrEqual(2900);
  }, 10000);
});
