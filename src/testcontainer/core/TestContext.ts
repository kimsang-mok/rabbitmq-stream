import { ContainerConfig } from "./types";
import { ContainerFactory } from "./ContainerFactory";
import { StartedTestContainer } from "testcontainers";

export class TestContext {
  private startedContainers = new Map<string, StartedTestContainer>();

  constructor(private containers: ContainerConfig[]) {}

  async startAll() {
    const builds = this.containers.map((container) =>
      ContainerFactory.createContainer(container.name, container.options)
    );
    const started = await Promise.all(
      builds.map((container) => container.start())
    );

    this.containers.forEach((container, idx) =>
      this.startedContainers.set(container.name, started[idx])
    );
  }

  async stopAll() {
    await Promise.all(
      Array.from(this.startedContainers.values()).map((container) =>
        container.stop()
      )
    );
    this.startedContainers.clear();
  }

  getContainer(name: string) {
    const container = this.startedContainers.get(name);
    if (!container) throw new Error(`Container '${name}' not found.`);
    return container;
  }
}
