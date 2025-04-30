import { PUBLISHER_METADATA, CONSUMER_METADATA } from "./types";

export function Consumer(bindingName: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(CONSUMER_METADATA, bindingName, descriptor.value!);
  };
}

export function Publisher(bindingName: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(PUBLISHER_METADATA, bindingName, descriptor.value!);
  };
}
