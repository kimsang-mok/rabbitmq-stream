import { BinderConfig } from "binding/binder/types";
import { ConnectionManagerOptions } from "connection/types";

export interface MessagingApplicationOptions {
  connection: ConnectionManagerOptions;
  binder: BinderConfig;
}
