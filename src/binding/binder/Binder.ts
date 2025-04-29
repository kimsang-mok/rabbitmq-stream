import { InputBinding } from "binding/in-binding/InputBinding";
import {
  BinderConfig,
  IBinder,
  PUBLISHER_METADATA,
  SUBSCRIBER_METADATA,
} from "./types";
import { OutputBinding } from "binding/out-binding/OutputBinding";
import { ChannelManager } from "connection/ChannelManager";
import { InputBindingOptions } from "binding/in-binding/types";
import { OutputBindingOptions } from "binding/out-binding/types";
import { LoggerFactory } from "logging/LoggerFactory";

export class Binder implements IBinder {
  private logger = LoggerFactory.createDefaultLogger(Binder.name);

  private inputs: { [name: string]: InputBinding } = {};
  private outputs: { [name: string]: OutputBinding } = {};

  constructor(private channelManager: ChannelManager) {}

  async bindInput(
    name: string,
    options: InputBindingOptions
  ): Promise<InputBinding> {
    const binding = new InputBinding(this.channelManager, options);
    await binding.init();
    this.inputs[name] = binding;
    return binding;
  }

  async bindOutput(
    name: string,
    options: OutputBindingOptions
  ): Promise<OutputBinding> {
    const binding = new OutputBinding(this.channelManager, options);
    await binding.init();
    this.outputs[name] = binding;
    return binding;
  }

  async bindFromConfig(config: BinderConfig): Promise<{
    inputs: { [k: string]: InputBinding };
    outputs: { [k: string]: OutputBinding };
  }> {
    if (config.outputs) {
      for (const [name, opt] of Object.entries(config.outputs)) {
        await this.bindOutput(name, opt);
      }
    }
    if (config.inputs) {
      for (const [name, opt] of Object.entries(config.inputs)) {
        await this.bindInput(name, opt);
      }
    }

    return { inputs: this.inputs, outputs: this.outputs };
  }

  async bindSubscribers(services: any[]) {
    for (const service of services) {
      const proto = Object.getPrototypeOf(service);
      const methods = Object.getOwnPropertyNames(proto).filter(
        (m) => typeof service[m] === "function" && m !== "constructor"
      );

      for (const methodName of methods) {
        const method = service[methodName];

        const subscriberBinding = Reflect.getMetadata(
          SUBSCRIBER_METADATA,
          method
        );
        const publisherBinding = Reflect.getMetadata(
          PUBLISHER_METADATA,
          method
        );

        if (subscriberBinding) {
          const inputBinding = this.inputs[subscriberBinding];
          if (!inputBinding) {
            throw new Error(`No input binding found for ${subscriberBinding}`);
          }
          inputBinding.setHandler(async (msg) => {
            await service[methodName](msg);
          });
          await inputBinding.start();
          this.logger.info(
            `Bound subscriber ${methodName} to ${subscriberBinding}`
          );
        }

        if (publisherBinding) {
          const outputBinding = this.outputs[publisherBinding];
          if (!outputBinding) {
            throw new Error(`No output binding found for ${publisherBinding}`);
          }

          const originalMethod = service[methodName].bind(service);

          service[methodName] = async (...args: any[]) => {
            const result = await originalMethod(...args);

            if (result !== undefined) {
              let payload = result;
              let delayMs: number | undefined;
              let headers: Record<string, any> = {};

              if (
                typeof result === "object" &&
                "data" in result &&
                typeof result.publishOptions === "object"
              ) {
                payload = result.data;
                delayMs = result.publishOptions?.delayMs;
                headers = result.publishOptions?.headers || {};
              }

              if (delayMs != null) {
                this.logger.info("Publish delayed message", {
                  payload,
                  delayMs,
                });
                await outputBinding.publishDelayed(payload, delayMs); // headers support can be added later
              } else {
                this.logger.info("Publish normal message", {
                  payload,
                });
                await outputBinding.publish(payload);
              }
            }

            return result;
          };

          this.logger.info(
            `Bound publisher ${methodName} to ${publisherBinding}`
          );
        }
      }
    }
  }

  public getInputBinding(name: string): InputBinding | undefined {
    return this.inputs[name];
  }

  public getOutputBinding(name: string): OutputBinding | undefined {
    return this.outputs[name];
  }
}
