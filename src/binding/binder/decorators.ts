import { PUBLISHER_METADATA, SUBSCRIBER_METADATA } from "./types";

export function Subscriber(bindingName: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(SUBSCRIBER_METADATA, bindingName, descriptor.value!);
  };
}

export function Publisher(bindingName: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(PUBLISHER_METADATA, bindingName, descriptor.value!);
  };
}
