import { DelayManagerConfig, DelayStrategy } from "./types";
import { TTLDelayStrategy, XDelayedPluginStrategy } from "./DelayStrategy";

export class DelayManager {
  static createStrategy(config: DelayManagerConfig): DelayStrategy {
    switch (config.strategy) {
      case "ttl": {
        if (!config.targetQueue || !config.delayMs) {
          throw new Error(
            "TTL delay strategy requires both targetQueue and delayMs"
          );
        }
        return new TTLDelayStrategy(config.targetQueue, config.delayMs);
      }

      case "plugin": {
        if (!config.exchange) {
          throw new Error("Plugin delay strategy requires an exchange");
        }

        return new XDelayedPluginStrategy(
          config.exchange,
          config.exchangeType,
          config.xDelayedType
        );
      }

      default:
        throw new Error(`Unsupported delay strategy: ${config.strategy}`);
    }
  }
}
