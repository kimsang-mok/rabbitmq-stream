import { getRegisteredMessagingServices } from "messaging-registry/messagingServiceRegistry";
import { MessagingApplication } from "./application/MessagingApplication";
import { MessagingApplicationOptions } from "./application/types";
import { GlobalLogger } from "./logging/GlobalLogger";

export async function createMessagingContext(
  options: MessagingApplicationOptions
) {
  GlobalLogger.initialize(options.observability?.logLevel || "info");

  const app = new MessagingApplication(options);

  await app.start();

  // bind class-based services
  const services = getRegisteredMessagingServices();
  await app.bindServices(services);

  return app;
}
