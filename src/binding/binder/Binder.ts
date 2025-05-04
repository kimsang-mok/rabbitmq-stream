import { InputBinding } from "binding/in-binding/InputBinding";
import {
  BinderConfig,
  IBinder,
  PUBLISHER_METADATA,
  CONSUMER_METADATA,
} from "./types";
import { OutputBinding } from "binding/out-binding/OutputBinding";
import { ChannelManager } from "connection/ChannelManager";
import { InputBindingOptions } from "binding/in-binding/types";
import { OutputBindingOptions } from "binding/out-binding/types";
import { LoggerFactory } from "logging/LoggerFactory";
import {
  getFunctionConsumers,
  getFunctionPublishers,
  setBoundPublisher,
} from "messaging-registry/messagingFunctionRegistry";

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

  async bindMethods(services: any[]) {
    for (const service of services) {
      const proto = Object.getPrototypeOf(service);

      const methodNames = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== "constructor" && typeof proto[name] === "function"
      );

      for (const methodName of methodNames) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
        if (!descriptor || typeof descriptor.value !== "function") continue;

        const originalMethod = descriptor.value;

        const consumerBinding = Reflect.getMetadata(
          CONSUMER_METADATA,
          originalMethod
        );
        const publisherBinding = Reflect.getMetadata(
          PUBLISHER_METADATA,
          originalMethod
        );

        if (consumerBinding) {
          const inputBinding = this.inputs[consumerBinding];
          if (!inputBinding) {
            throw new Error(`No input binding found for ${consumerBinding}`);
          }
          inputBinding.setHandler(async (msg, rawMsg) => {
            if (originalMethod.length >= 2) {
              await originalMethod.call(service, msg, rawMsg);
            } else {
              await originalMethod.call(service, msg);
            }
          });
          await inputBinding.start();
          this.logger.info(
            `Bound consumer ${methodName} to ${consumerBinding}`
          );
        }

        if (publisherBinding) {
          const outputBinding = this.outputs[publisherBinding];
          if (!outputBinding) {
            throw new Error(`No output binding found for ${publisherBinding}`);
          }

          service[methodName] = async (...args: any[]) => {
            const result = await originalMethod.apply(service, args);

            if (result !== undefined) {
              let payload = result;
              let delayMs: number | undefined;
              let messageOptions: Record<string, any> = {};

              if (
                typeof result === "object" &&
                "data" in result &&
                typeof result.messageOptions === "object"
              ) {
                payload = result.data;
                messageOptions = result.messageOptions;
                delayMs = messageOptions?.delayMs;
              }

              if (delayMs != null) {
                this.logger.debug("Publish delayed message", {
                  payload,
                  delayMs,
                  messageOptions,
                });
                await outputBinding.publishDelayed(
                  payload,
                  delayMs,
                  undefined,
                  messageOptions
                );
              } else {
                this.logger.debug("Publish normal message", {
                  payload,
                  messageOptions,
                });
                await outputBinding.publish(payload, undefined, messageOptions);
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

  async bindFunctions() {
    const consumers = getFunctionConsumers();
    const publishers = getFunctionPublishers();

    for (const [bindingName, handler] of Object.entries(consumers)) {
      const input = this.inputs[bindingName];
      if (!input) throw new Error(`Input binding '${bindingName}' not found`);
      input.setHandler(handler);
      await input.start();
      this.logger.info(`Bound functional consumer to ${bindingName}`);
    }

    for (const [bindingName, handler] of Object.entries(publishers)) {
      const output = this.outputs[bindingName];
      if (!output) throw new Error(`Output binding '${bindingName}' not found`);

      const wrapped = async (...args: any[]) => {
        const result = await handler(...args);
        if (!result) return;

        let payload = result;
        let delayMs: number | undefined;
        let messageOptions: Record<string, any> = {};

        if (
          typeof result === "object" &&
          "data" in result &&
          typeof result.messageOptions === "object"
        ) {
          payload = result.data;
          messageOptions = result.messageOptions;
          delayMs = messageOptions?.delayMs;
        }

        if (delayMs != null) {
          await output.publishDelayed(
            payload,
            delayMs,
            undefined,
            messageOptions
          );
        } else {
          await output.publish(payload, undefined, messageOptions);
        }

        return result;
      };

      setBoundPublisher(bindingName, wrapped);
      this.logger.info(`Bound functional publisher to ${bindingName}`);
    }
  }

  public getInputBinding(name: string): InputBinding | undefined {
    return this.inputs[name];
  }

  public getOutputBinding(name: string): OutputBinding | undefined {
    return this.outputs[name];
  }
}
