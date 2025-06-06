import { InputBinding } from "binding/in-binding/InputBinding";
import { InputBindingOptions } from "binding/in-binding/types";
import { OutputBinding } from "binding/out-binding/OutputBinding";
import { OutputBindingOptions } from "binding/out-binding/types";

export interface BinderConfig {
  inputs?: InputBindingOptionsMap;
  outputs?: OutputBindingOptionsMap;
}

interface InputBindingOptionsMap {
  [name: string]: InputBindingOptions;
}
interface OutputBindingOptionsMap {
  [name: string]: OutputBindingOptions;
}

/**
 * generic binder interface for extensibility.
 */
export interface IBinder {
  bindInput(name: string, options: InputBindingOptions): Promise<InputBinding>;
  bindOutput(
    name: string,
    options: OutputBindingOptions
  ): Promise<OutputBinding>;
}

export const CONSUMER_METADATA = Symbol("subscriber");
export const PUBLISHER_METADATA = Symbol("publisher");
