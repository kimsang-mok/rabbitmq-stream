import { ContainerFactory } from "testcontainer/core/ContainerFactory";
import { GenericContainer } from "testcontainers";

type RabbitMQOptions = {
  username?: string;
  password?: string;
  image?: string;
  ports?: {
    amqp?: number;
    management?: number;
  };
};

ContainerFactory.definePreset<RabbitMQOptions>("rabbitmq", (options) => {
  const {
    username = "guest",
    password = "guest",
    image = "rabbitmq-delayed-local",
    ports = {
      amqp: 5672,
      management: 15672,
    },
  } = options || {};

  return new GenericContainer(image)
    .withExposedPorts(ports.amqp!, ports.management!)
    .withEnvironment({
      RABBITMQ_DEFAULT_USER: username,
      RABBITMQ_DEFAULT_PASS: password,
    });
});
