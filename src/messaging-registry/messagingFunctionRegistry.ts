import { Message } from "amqplib";
import { PublisherReturnType } from "binding/out-binding";

type ConsumerHandler<TPayload = any> = (
  event: TPayload,
  rawEvent?: Message
) => Promise<any>;

type PublisherHandler<TPayload = any> = (
  ...args: any[]
) => PublisherReturnType<TPayload>;

const functionConsumers: Record<string, ConsumerHandler> = {};
const functionPublishers: Record<string, PublisherHandler> = {};
const activeBoundPublishers: Record<string, (...args: any[]) => Promise<any>> =
  {};

export function registerConsumer(
  bindingName: string,
  handler: ConsumerHandler
) {
  functionConsumers[bindingName] = handler;
}

export function registerPublisher(
  bindingName: string,
  handler: PublisherHandler
) {
  functionPublishers[bindingName] = handler;
}

export function getFunctionConsumers() {
  return functionConsumers;
}

export function getFunctionPublishers() {
  return functionPublishers;
}

export function setBoundPublisher(
  name: string,
  fn: (...args: any[]) => Promise<any>
) {
  activeBoundPublishers[name] = fn;
}

export function getBoundPublisher(name: string) {
  const fn = activeBoundPublishers[name];
  if (!fn)
    throw new Error(`Publisher '${name}' is not bound or initialized yet`);
  return fn;
}
