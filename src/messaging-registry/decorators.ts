import { registerMessagingService } from "./messagingServiceRegistry";

/**
 * Class decorator: `@MessagingService`
 *
 * Marks a class as a messaging-aware service and ensures that the instance
 * is automatically registered with the global messaging registry upon instantiation.
 *
 * Framework-agnostic:
 * - Works with any DI framework (e.g., Inversify, TSyringe)
 * - Does not interfere with constructor injection
 *
 * Behavior:
 * - Subclasses the original class to inject registration logic
 * - Ensures registration occurs only once per instance
 * - Copies static properties and prototype methods to preserve original behavior
 * - Retains reflect metadata (required for method decorators like @Publisher/@Consumer)
 *
 * @returns A class decorator that wraps the target class and registers it when instantiated
 */
export function MessagingService(): ClassDecorator {
  return function <T extends { new (...args: any[]): any }>(
    OriginalClass: T
  ): T {
    const RegisteredKey = Symbol("registered");

    class Wrapped extends OriginalClass {
      constructor(...args: any[]) {
        super(...args);
        if (!(this as any)[RegisteredKey]) {
          registerMessagingService(this);
          (this as any)[RegisteredKey] = true;
        }
      }
    }

    Object.getOwnPropertyNames(OriginalClass).forEach((key) => {
      if (key !== "prototype") {
        Object.defineProperty(
          Wrapped,
          key,
          Object.getOwnPropertyDescriptor(OriginalClass, key)!
        );
      }
    });

    Object.getOwnPropertyNames(OriginalClass.prototype).forEach((name) => {
      if (name !== "constructor") {
        Object.defineProperty(
          Wrapped.prototype,
          name,
          Object.getOwnPropertyDescriptor(OriginalClass.prototype, name)!
        );
      }
    });

    Reflect.getMetadataKeys(OriginalClass).forEach((key) => {
      const metadata = Reflect.getMetadata(key, OriginalClass);
      Reflect.defineMetadata(key, metadata, Wrapped);
    });

    return Wrapped;
  } as ClassDecorator;
}
