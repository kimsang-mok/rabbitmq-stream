"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const events_1 = require("events");
const ConnectionFactory_1 = require("./ConnectionFactory");
const ChannelManager_1 = require("./ChannelManager");
const ReconnectStrategy_1 = require("./ReconnectStrategy");
const events_2 = require("./events");
class ConnectionManager extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this.reconnectAttempts = 0;
        this.reconnecting = false;
        this.closed = false;
    }
    async connect() {
        try {
            this.connection = await ConnectionFactory_1.ConnectionFactory.createConnection(this.options.url);
            this.reconnectAttempts = 0;
            this.closed = false;
            this.channelManager = new ChannelManager_1.ChannelManager(this.connection);
            await this.channelManager.createChannels();
            this.attachEventHandlers(this.connection);
            this.emit(events_2.ConnectionEvents.CONNECTED); // << uses constant
            console.log("[ConnectionManager] Connected to RabbitMQ");
        }
        catch (err) {
            console.error("[ConnectionManager] Initial connect failed:", err);
            this.scheduleReconnect();
        }
    }
    attachEventHandlers(conn) {
        conn.on("error", (err) => {
            console.error("[ConnectionManager] Connection error:", err);
            this.emit(events_2.ConnectionEvents.ERROR, err);
        });
        conn.on("close", () => {
            console.warn("[ConnectionManager] Connection closed");
            this.emit(events_2.ConnectionEvents.CLOSED);
            this.scheduleReconnect();
            // if (!this.closed) {
            // }
        });
    }
    async scheduleReconnect() {
        if (this.reconnecting)
            return;
        this.reconnecting = true;
        const strategy = this.options.reconnectStrategy ??
            new ReconnectStrategy_1.FixedDelayStrategy(5000, this.options.maxReconnectAttempts);
        while (strategy.shouldRetry(++this.reconnectAttempts)) {
            const delayMs = strategy.nextDelay(this.reconnectAttempts);
            console.log(`[ConnectionManager] Reconnecting in ${delayMs}ms (attempt ${this.reconnectAttempts})`);
            this.emit(events_2.ConnectionEvents.RECONNECTING, this.reconnectAttempts);
            await new Promise((res) => setTimeout(res, delayMs));
            try {
                await this.connect();
                this.reconnecting = false;
                return;
            }
            catch (err) {
                console.error(`[ConnectionManager] Reconnect attempt failed:`, err);
            }
        }
        console.error("[ConnectionManager] Max reconnect attempts reached. Giving up.");
        this.emit(events_2.ConnectionEvents.RECONNECT_FAILED);
    }
    async disconnect() {
        this.closed = true;
        this.reconnecting = false;
        await this.channelManager?.closeChannels();
        await this.connection?.close().catch(() => { });
        console.log("[ConnectionManager] Disconnected from RabbitMQ");
        this.emit(events_2.ConnectionEvents.DISCONNECTED); // << uses constant
    }
    getChannelManager() {
        if (!this.channelManager) {
            throw new Error("Connection not established");
        }
        return this.channelManager;
    }
}
exports.ConnectionManager = ConnectionManager;
