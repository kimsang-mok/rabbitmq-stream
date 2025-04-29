import "reflect-metadata";
import "module-alias";

import { MessagingApplicationOptions } from "application/types";
import { MessagingApplication } from "application/MessagingApplication";
import { GlobalLogger } from "logging/GlobalLogger";

async function bootstrap() {
  console.log("System initialized.");

  await createMessagingApplication();
}

bootstrap().catch((err) => {
  console.error("System failed to initialize.", err);
  process.exit(1);
});

async function createMessagingApplication() {
  const config = loadUserConfig();

  GlobalLogger.initialize(config.observability?.logLevel || "info");

  const app = new MessagingApplication(config);

  await app.start();

  const { default: userService } = await import("example/user/UserService");

  await app.bindServices([userService]);

  userService.createUser({ name: "Kimsang" });

  return app;
}

function loadUserConfig(): MessagingApplicationOptions {
  return {
    connection: {
      uri: "amqp://localhost",
      reconnectStrategy: "fixed",
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
    observability: {
      logLevel: "debug",
    },
  };
}
