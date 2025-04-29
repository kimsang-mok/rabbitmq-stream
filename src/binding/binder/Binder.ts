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

  bindInput(name: string, options: InputBindingOptions): InputBinding {
    const binding = new InputBinding(this.channelManager, options);
    this.inputs[name] = binding;
    return binding;
  }

  bindOutput(name: string, options: OutputBindingOptions): OutputBinding {
    const binding = new OutputBinding(this.channelManager, options);
    this.outputs[name] = binding;
    return binding;
  }

  bindFromConfig(config: BinderConfig): {
    inputs: { [k: string]: InputBinding };
    outputs: { [k: string]: OutputBinding };
  } {
    if (config.inputs) {
      for (const [name, opt] of Object.entries(config.inputs)) {
        this.bindInput(name, opt);
      }
    }
    if (config.outputs) {
      for (const [name, opt] of Object.entries(config.outputs)) {
        this.bindOutput(name, opt);
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

          // wrap the method to auto-publish after it executes
          const originalMethod = service[methodName].bind(service);

          service[methodName] = async (...args: any[]) => {
            const result = await originalMethod(...args);
            if (result !== undefined) {
              await outputBinding.publish(result);
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
