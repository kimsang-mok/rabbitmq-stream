export declare const ConnectionEvents: {
    readonly CONNECTED: "connection.connected";
    readonly DISCONNECTED: "connection.disconnected";
    readonly RECONNECTING: "connection.reconnecting";
    readonly RECONNECT_FAILED: "connection.reconnect_failed";
    readonly ERROR: "connection.error";
    readonly CLOSED: "connection.closed";
};
export type ConnectionEvent = (typeof ConnectionEvents)[keyof typeof ConnectionEvents];
