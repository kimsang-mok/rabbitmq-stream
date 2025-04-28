import { InputBinding } from "binding/in-binding/InputBinding";
import { BinderConfig, IBinder } from "./types";
import { OutputBinding } from "binding/out-binding/OutputBinding";
import { ChannelManager } from "connection/ChannelManager";
import { InputBindingOptions } from "binding/in-binding/types";
import { OutputBindingOptions } from "binding/out-binding/types";

export class Binder implements IBinder {
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
}
