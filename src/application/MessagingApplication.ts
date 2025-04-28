import { Binder } from "binding/binder/Binder";
import { ChannelManager } from "connection/ChannelManager";
import { ConnectionManager } from "connection/ConnectionManager";
import { MessagingApplicationOptions } from "./types";
import userService from "example/user/UserService";

export class MessagingApplication {
  private connectionManager: ConnectionManager;
  private channelManager: ChannelManager;
  public binder: Binder;

  constructor(private options: MessagingApplicationOptions) {
    this.connectionManager = ConnectionManager.getInstance({
      ...options.connection,
    });
    this.channelManager = new ChannelManager(this.connectionManager);
    this.binder = new Binder(this.channelManager);
  }

  async start(): Promise<void> {
    await this.connectionManager.connect();

    this.binder.bindFromConfig(this.options.binder);

    const services = [userService];

    await this.binder.bindSubscribers(services);
  }

  async stop(): Promise<void> {
    await this.connectionManager.close();
  }
}
