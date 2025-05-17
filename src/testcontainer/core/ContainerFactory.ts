import { GenericContainer } from "testcontainers";
import { ContainerBuilder } from "./types";

/**
 * ContainerFactory allows registering and creating container definitions (presets)
 */
export class ContainerFactory {
  private static presets: Map<string, ContainerBuilder<any>> = new Map();

  static definePreset<TOptions = any>(
    name: string,
    builder: ContainerBuilder<TOptions>
  ) {
    this.presets.set(name, builder);
  }

  static createContainer<TOptions = any>(
    name: string,
    options?: TOptions
  ): GenericContainer {
    const builder = this.presets.get(name);
    if (!builder) throw new Error(`Preset '${name}' is not defined.`);
    return builder(options);
  }
}
