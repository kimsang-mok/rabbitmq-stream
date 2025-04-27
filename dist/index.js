"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("module-alias");
const ConnectionManager_1 = require("connection/ConnectionManager");
const events_1 = require("connection/events");
async function bootstrap() {
    console.log("System initialized.");
    const connectionManager = new ConnectionManager_1.ConnectionManager({
        url: "amqp://localhost:5672",
        maxReconnectAttempts: 5,
    });
    connectionManager.on(events_1.ConnectionEvents.CONNECTED, () => {
        console.log("[Event] Connected to RabbitMQ");
    });
    connectionManager.on(events_1.ConnectionEvents.ERROR, (err) => {
        console.error("[Event] Connection error:", err);
    });
    connectionManager.on(events_1.ConnectionEvents.CLOSED, () => {
        console.warn("[Event] Connection closed");
    });
    connectionManager.on(events_1.ConnectionEvents.RECONNECTING, (attempt) => {
        console.log(`[Event] Reconnecting... attempt ${attempt}`);
    });
    connectionManager.on(events_1.ConnectionEvents.RECONNECT_FAILED, () => {
        console.error("[Event] Reconnect failed after max attempts");
        process.exit(1); // optional: you can decide whether to crash the app
    });
    connectionManager.on(events_1.ConnectionEvents.DISCONNECTED, () => {
        console.log("[Event] Disconnected cleanly");
    });
    await connectionManager.connect();
    return connectionManager;
}
bootstrap().catch((err) => {
    console.error("System failed to initialize.", err);
    process.exit(1);
});
