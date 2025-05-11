import { TestContext } from "./core/TestContext";
import { ContainerConfig } from "./core/types";

/**
 * create a new test context with container configs
 * @param configs
 * @returns
 */
export function createTestContext(configs: ContainerConfig[]) {
  return new TestContext(configs);
}
