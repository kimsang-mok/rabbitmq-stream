import { MessagingApplication } from "application/MessagingApplication";
import { createMessagingContext } from "createMessagingContext";
import { RetryAndDLQFixture } from "test/fixture/RetryAndDLQFixture";
import {
  startRabbitContainer,
  stopRabbitContainer,
} from "test/setup/testContainer";

describe("Retry and Dead Letter Queue", () => {
  let context: MessagingApplication;
  let service: RetryAndDLQFixture;

  const attempts: any[] = [];
  const dlqMessages: any[] = [];

  beforeAll(async () => {
    const { amqpUri } = await startRabbitContainer();
    service = new RetryAndDLQFixture();

    context = await createMessagingContext({
      connection: { uri: amqpUri },
      binder: {
        inputs: {
          retryTestConsumer: {
            queue: "test.retry.queue",
            exchange: "test.retry.exchange",
            routingKey: "test.retry",
            retry: {
              strategy: "fixed",
              maxAttempts: 3,
              backoffInitial: 100,
              backoffMultiplier: 1,
            },
          },

          dlqConsumer: {
            queue: "test.retry.queue.parkingLot",
            exchange: "test.retry.exchange.retry",
            exchangeType: "direct",
            routingKey: "test.retry.parkinglot",
          },
        },
        outputs: {
          testPublisher: {
            exchange: "test.retry.exchange",
            defaultRoutingKey: "test.retry",
          },
        },
      },
    });

    service.events.on("attempt", (msg) => attempts.push(msg));
    service.events.on("dlq", (msg) => dlqMessages.push(msg));
  }, 60000);

  afterAll(async () => {
    await context?.stop();
    await stopRabbitContainer();
  });

  it("should retry and eventually send to DLQ", async () => {
    await service.publishMessage({ id: "retry-test" });

    await new Promise((res) => setTimeout(res, 2000)); // wait for retries

    expect(attempts.length).toBe(3);
    expect(dlqMessages.length).toBe(1);
    expect(dlqMessages[0]).toEqual({ data: { id: "retry-test" } });
  });
});
