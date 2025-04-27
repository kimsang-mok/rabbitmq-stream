import { EventEmitter } from "events";
import { ChannelManager } from "./ChannelManager";
import { ConnectionManagerOptions } from "./types";
export declare class ConnectionManager extends EventEmitter {
    private options;
    private connection?;
    private channelManager?;
    private reconnectAttempts;
    private reconnecting;
    private closed;
    constructor(options: ConnectionManagerOptions);
    connect(): Promise<void>;
    private attachEventHandlers;
    private scheduleReconnect;
    disconnect(): Promise<void>;
    getChannelManager(): ChannelManager;
}
