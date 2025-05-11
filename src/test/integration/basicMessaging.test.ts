import { MessagingApplication } from "application/MessagingApplication";
import { createMessagingContext } from "createMessagingContext";
import { GlobalLogger } from "logging/GlobalLogger";
import { BasicMessagingFixture } from "test/fixture/BasicMessagingFixture";
import {
  startRabbitContainer,
  stopRabbitContainer,
} from "test/setup/testContainer";

describe("Basic Publish/Consume Flow", () => {
  let messagingContext: MessagingApplication;
  let service: BasicMessagingFixture;
  const received: any[] = [];

  beforeAll(async () => {
    const { amqpUri } = await startRabbitContainer();
    GlobalLogger.initialize();
    service = new BasicMessagingFixture();

    messagingContext = await createMessagingContext({
      connection: { uri: amqpUri },
      binder: {
        inputs: {
          testConsumer: {
            queue: "test.queue",
            exchange: "test.exchange",
            routingKey: "test",
          },
        },
        outputs: {
          testPublisher: {
            exchange: "test.exchange",
            defaultRoutingKey: "test",
          },
        },
      },
    });

    service.onMessage((msg) => received.push(msg));
  }, 10000);

  afterAll(async () => {
    await messagingContext?.stop();
    await stopRabbitContainer();
  });

  it("should publish and consume a message", async () => {
    await service.publishTestMessage({ id: "test-1" });

    await new Promise((res) => setTimeout(res, 500)); // wait for processing

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ data: { id: "test-1" } });
  });
});
