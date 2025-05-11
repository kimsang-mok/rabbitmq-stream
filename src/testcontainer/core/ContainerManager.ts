import { IContainer } from "./types";

export class ContainerManager {
  static async startAll(containers: IContainer[]): Promise<IContainer[]> {
    const started = await Promise.all(
      containers.map((container) => container.start())
    );
    return started;
  }

  static async stopAll(startedContainers: IContainer[]): Promise<void> {
    await Promise.all(startedContainers.map((container) => container.stop()));
  }
}
