import { registerMessagingService } from "./messagingServiceRegistry";

export function MessagingService(): ClassDecorator {
  return function (target: any) {
    const originalConstructor = target;

    const newConstructor: any = function (...args: any[]) {
      const instance = new originalConstructor(...args);
      registerMessagingService(instance);
      return instance;
    };

    newConstructor.prototype = originalConstructor.prototype;

    return newConstructor;
  };
}
