import { GenericContainer } from "testcontainers";

export type ContainerBuilder<TOptions = any> = (
  options?: TOptions
) => GenericContainer;

export type ContainerConfig = {
  name: string;
  options?: Record<string, any>;
};

export interface IContainer {
  start(): Promise<IContainer>;
  stop(): Promise<void>;
  getHost(): string;
  getMappedPort(port: number): number;
  [key: string]: any;
}
