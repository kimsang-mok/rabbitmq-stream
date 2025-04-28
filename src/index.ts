import "reflect-metadata";
import "module-alias";

import { ConnectionManager } from "connection/ConnectionManager";
import { ChannelManager } from "connection/ChannelManager";
import { ChannelType } from "connection/types";
import { MessagingApplicationOptions } from "application/types";
import { MessagingApplication } from "application/MessagingApplication";
import userService from "example/user/UserService";

async function bootstrap() {
  console.log("System initialized.");

  // createSimpleApplication();

  await createMessagingApplication();

  await userService.createUser({ name: "Kimsang" });
}

bootstrap().catch((err) => {
  console.error("System failed to initialize.", err);
  process.exit(1);
});

async function createMessagingApplication() {
  const config: MessagingApplicationOptions = {
    connection: {
      uri: "amqp://localhost",
      reconnectStrategy: "jittered",
    },
    binder: {
      inputs: {
        userCreatedInput: {
          queue: "user.created.queue",
          exchange: "user.exchange",
          routingKey: "user.created",
          retry: {
            strategy: "exponential",
            maxAttempts: 5,
          },
        },
      },
      outputs: {
        userPublisher: {
          exchange: "user.exchange",
          exchangeType: "topic",
          defaultRoutingKey: "user.created",
        },
      },
    },
  };

  const app = new MessagingApplication(config);

  await app.start();

  return app;
}

async function createSimpleApplication() {
  const connectionManager = ConnectionManager.getInstance({
    uri: "amqp://guest:guest@localhost:5672/",
    reconnectStrategy: "exponential", // use exponential backoff
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
    maxReconnectAttempts: 3,
    amqpOptions: { heartbeat: 10 }, // optional
  });
  await connectionManager.connect(); // establish connection (will keep retrying if fails)

  await connectionManager.assertExchange("logs", "topic", { durable: true });
  await connectionManager.assertQueue("logs.queue", { durable: true });
  await connectionManager.bindQueue("logs.queue", "logs", "#");

  const channelManager = new ChannelManager(connectionManager);

  const consumerChannel = await channelManager.getChannel(ChannelType.Consumer);
  consumerChannel.consume("logs.queue", (msg) => {
    if (msg) {
      console.log("Received log:", msg.content.toString());
      consumerChannel.ack(msg);
    }
  });

  const publisherChannel = await channelManager.getChannel(
    ChannelType.Publisher
  );
  publisherChannel.publish(
    "logs",
    "app.info",
    Buffer.from("Hello World"),
    {},
    (err, ok) => {
      if (err) {
        console.error("Publish failed:", err);
      } else {
        console.log("Message published");
      }
    }
  );

  // listen for events (optional, for logging or custom handling)
  connectionManager.on("connected", () => console.log("RabbitMQ connected"));
  connectionManager.on("disconnected", (err) =>
    console.warn("Disconnected from RabbitMQ:", err)
  );
  connectionManager.on("reconnecting", (attempt) =>
    console.log(`Reconnecting... attempt ${attempt}`)
  );
}
