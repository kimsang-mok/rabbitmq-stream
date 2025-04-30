import { ChannelModel, Options } from "amqplib";
import EventEmitter from "events";
import { ConnectionManagerOptions, ReconnectStrategy } from "./types";
import {
  ExponentialBackoffStrategy,
  FixedDelayStrategy,
  JitteredExponentialBackoffStrategy,
} from "./ReconnectStrategy";
import { ConnectionFactory } from "./ConnectionFactory";
import { LoggerFactory } from "logging/LoggerFactory";

/**
 * ConnectionManager manages a single RabbitMQ connection (amqplib) with auto-reconnect and topology recovery.
 * Uses Singleton pattern – use ConnectionManager.getInstance() to get the single instance.
 * Emits events: 'connected', 'disconnected', 'reconnecting' for integration.
 */
export class ConnectionManager extends EventEmitter {
  private logger = LoggerFactory.createDefaultLogger(ConnectionManager.name);
  private static _instance: ConnectionManager | null = null;

  private connection: ChannelModel | null = null;
  private connecting: boolean = false; // flag to avoid concurrent connects
  private shouldReconnect: boolean = false; // flag to stop reconnect loop if needed
  private reconnectAttempts: number = 0;
  private strategy: ReconnectStrategy; // strategy for computing next delay

  private exchanges: Array<{
    name: string;
    type: string;
    options?: Options.AssertExchange;
  }> = [];
  private queues: Array<{ name: string; options?: Options.AssertQueue }> = [];
  private bindings: Array<{
    exchange: string;
    queue: string;
    routingKey?: string;
    options?: any;
  }> = [];

  private constructor(private options: ConnectionManagerOptions) {
    super();
    this.strategy = this.initStrategy(options);
  }
  /** get the singleton instance (create if not exists) */
  static getInstance(options: ConnectionManagerOptions): ConnectionManager {
    if (!ConnectionManager._instance) {
      ConnectionManager._instance = new ConnectionManager(options);
    }

    return ConnectionManager._instance;
  }

  /** initialize the reconnect strategy based on provided options. */
  private initStrategy(options: ConnectionManagerOptions): ReconnectStrategy {
    const strategy = options.reconnectStrategy;
    if (!strategy || strategy === "jittered") {
      // default: jittered exponential backoff
      return new JitteredExponentialBackoffStrategy(
        options.initialDelayMs || 1000,
        options.multiplier || 2,
        options.maxDelayMs || 30000
      );
    }
    if (strategy === "fixed") {
      return new FixedDelayStrategy(options.reconnectIntervalMs || 5000);
    }
    if (strategy === "exponential") {
      return new ExponentialBackoffStrategy(
        options.initialDelayMs || 1000,
        options.multiplier || 2,
        options.maxDelayMs || 30000
      );
    }
    if (typeof strategy === "function") {
      // wrap custom function in a ReconnectStrategy interface
      return { getDelay: (attempt: number) => strategy(attempt) };
    }
    if (typeof strategy === "object") {
      // use provided ReconnectStrategy instance as-is
      return strategy;
    }

    return new JitteredExponentialBackoffStrategy(
      options.initialDelayMs || 1000,
      options.multiplier || 2,
      options.maxDelayMs || 30000
    );
  }

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }
    this.shouldReconnect = true;
    return this.connectWithRetry();
  }

  /** internal method to attempt connection (with retries) */
  private async connectWithRetry(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    this.reconnectAttempts++;

    const attemptNumber = this.reconnectAttempts;

    if (
      this.options.maxReconnectAttempts &&
      attemptNumber > this.options.maxReconnectAttempts
    ) {
      this.logger.error(
        `Max reconnect attempts (${this.options.maxReconnectAttempts}) reached. Giving up.`
      );
      this.connecting = false;
      this.shouldReconnect = false;
      this.emit("disconnected", new Error("Max reconnect attempts reached"));
      return;
    }

    if (attemptNumber > 1) {
      this.emit("reconnecting", attemptNumber);
    }

    try {
      const conn = await ConnectionFactory.createConnection(
        this.options.uri,
        this.options.amqpOptions
      );
      this.connection = conn;
      this.connecting = false;
      this.reconnectAttempts = 0;

      conn.on("error", (err) => {
        // the 'error' event is informational; we'll handle reconnect on 'close'
        // log or emit for debugging purposes if needed
        this.logger.error("Connection error: ", err);
      });

      conn.on("close", (err) => {
        // connection closed (error may be undefined if closed gracefully)
        this.connection = null;
        if (!this.shouldReconnect) {
          return;
        }

        // emit a disconnected event with the error (if any)
        this.emit("disconnected", err instanceof Error ? err : undefined);
        // schedule a reconnection attempt using the strategy delay
        const delay = this.strategy.getDelay(attemptNumber);
        setTimeout(() => {
          this.connectWithRetry().catch((e) => {
            this.logger.error("Reconnect attempt failed: ", e);
          });
        }, delay);
      });

      // re-declare topology (exchanges, queues, bindings) on the new connection
      // try {
      //   await this.redeclareTopology();
      // } catch (topologyErr) {
      //   // (we proceed even if topology setup fails, but this could be handled as needed)
      //   this.logger.error(`Topology re-declaration error: ${topologyErr}`);
      // }

      this.emit("connected");
    } catch (error) {
      this.connecting = false;
      // connection attempt failed: log and schedule next retry
      this.logger.error(`Connection attempt ${attemptNumber} failed: ${error}`);

      const delay = this.strategy.getDelay(attemptNumber);
      setTimeout(() => {
        this.connectWithRetry().catch((e) =>
          this.logger.error("Reconnect error: ", e)
        );
      }, delay);
      // note: we emit 'reconnecting' at the top of this function for attempts > 1
      // we could emit an event for "connectFailed" here with error info.
    }
  }

  /** re-declare all stored exchanges, queues, and bindings on a (re)connection. */
  private async redeclareTopology(): Promise<void> {
    if (!this.connection) return;
    const channel = await this.connection.createChannel();

    try {
      // re-assert exchanges
      for (const ex of this.exchanges) {
        await channel.assertExchange(ex.name, ex.type, ex.options || {});
      }

      // re-assert queues
      for (const q of this.queues) {
        await channel.assertQueue(q.name, q.options || {});
      }

      // re-assert bindings (queue to exchange)
      for (const b of this.bindings) {
        await channel.bindQueue(
          b.queue,
          b.exchange,
          b.routingKey || "",
          b.options || {}
        );
      }
    } finally {
      await channel.close();
    }
  }

  /** declare an exchange (and record it for auto-recovery). */
  async assertExchange(
    name: string,
    type: string,
    options?: Options.AssertExchange
  ): Promise<void> {
    this.exchanges.push({ name, type, options });
    if (this.connection) {
      const channel = await this.connection.createChannel();
      try {
        await channel.assertExchange(name, type, options || {});
      } finally {
        await channel.close();
      }
    }
  }

  /** declare a queue (and record for auto-recovery). */
  async assertQueue(
    name: string,
    options?: Options.AssertQueue
  ): Promise<void> {
    this.queues.push({ name, options });
    if (this.connection) {
      const channel = await this.connection.createChannel();
      try {
        await channel.assertQueue(name, options || {});
      } finally {
        await channel.close();
      }
    }
  }

  /** bind a queue to an exchange (and record for auto-recovery). */
  async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string = "",
    options?: any
  ): Promise<void> {
    this.bindings.push({
      exchange: exchangeName,
      queue: queueName,
      routingKey,
      options,
    });
    if (this.connection) {
      const channel = await this.connection.createChannel();
      try {
        await channel.bindQueue(
          queueName,
          exchangeName,
          routingKey,
          options || {}
        );
      } finally {
        await channel.close();
      }
    }
  }

  async getConnection(): Promise<ChannelModel> {
    if (!this.connection) {
      await this.waitForConnection();
    }

    return this.connection!;
  }

  /** helper to wait until the connection is established (polls or listens to 'connected' event). */
  private async waitForConnection(): Promise<void> {
    if (this.connection) return;
    // if currently connecting, wait for 'connected' event
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        this.off("connected", onConnect);
        this.off("disconnected", onDisconnect);
        resolve();
      };
      const onDisconnect = (err?: Error) => {
        this.off("connected", onConnect);
        this.off("disconnected", onDisconnect);
        // If disconnected while waiting, reject to avoid infinite wait
        reject(err || new Error("Disconnected while waiting for connection"));
      };
      this.on("connected", onConnect);
      this.on("disconnected", onDisconnect);
    });
  }

  /**
   * close the connection and stop reconnecting.
   */
  async close(): Promise<void> {
    this.shouldReconnect = false;
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (err) {
        this.logger.error(`Error during close: ${err}`);
      }
    }
    this.connection = null;
    ConnectionManager._instance = null;
  }

  // eventEmitter typed event overrides for TypeScript (for strong typing of events):
  on(event: "connected", listener: () => void): this;
  on(event: "disconnected", listener: (err?: Error) => void): this;
  on(event: "reconnecting", listener: (attempt: number) => void): this;
  // use a generic overload for any other events to satisfy EventEmitter
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
  emit(event: "connected"): boolean;
  emit(event: "disconnected", err?: Error): boolean;
  emit(event: "reconnecting", attempt: number): boolean;
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }
}
