import { createMessagingContext } from "createMessagingContext";
import {
  startRabbitContainer,
  stopRabbitContainer,
} from "test/setup/testContainer";
import { MessagingApplication } from "application/MessagingApplication";
import { ConnectionManager } from "connection/ConnectionManager";
import { GlobalLogger } from "logging/GlobalLogger";

describe("Connection", () => {
  let rabbitUri: string;
  let messagingContext: MessagingApplication;

  beforeAll(async () => {
    const { amqpUri } = await startRabbitContainer();
    rabbitUri = amqpUri;
    GlobalLogger.initialize();
  }, 10000);

  afterAll(async () => {
    await messagingContext?.stop();
    await stopRabbitContainer();
  });

  it("should connect to RabbitMQ via framework", async () => {
    // create a promise that resolves on "connected" event
    const connectionEstablished = new Promise<void>((resolve, reject) => {
      const manager = ConnectionManager.getInstance({
        uri: rabbitUri,
      });
      const timeout = setTimeout(() => {
        reject(
          new Error("Timeout: ConnectionManager never emitted 'connected'")
        );
      }, 4000);

      manager.once("connected", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    messagingContext = await createMessagingContext({
      connection: {
        uri: rabbitUri,
        reconnectStrategy: "fixed",
        reconnectIntervalMs: 1000,
      },
      binder: { inputs: {}, outputs: {} },
    });

    await expect(connectionEstablished).resolves.toBeUndefined();
  });
});
