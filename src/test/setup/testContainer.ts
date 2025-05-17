import { createTestContext } from "testcontainer";
import "testcontainer/preset/RabbitMQPreset";

let context: ReturnType<typeof createTestContext>;

export async function startRabbitContainer() {
  context = createTestContext([
    {
      name: "rabbitmq",
      options: {
        username: "guest",
        password: "guest",
        image: "rabbitmq-delayed-local",
      },
    },
  ]);
  await context.startAll();

  const container = context.getContainer("rabbitmq");
  const host = container.getHost();
  const amqpPort = container.getMappedPort(5672);
  const managementPort = container.getMappedPort(15672);

  const amqpUri = `amqp://guest:guest@${host}:${amqpPort}`;
  const managementUri = `http://${host}:${managementPort}`;

  return { amqpUri, managementUri, container };
}

export async function stopRabbitContainer() {
  await context.stopAll();
}
