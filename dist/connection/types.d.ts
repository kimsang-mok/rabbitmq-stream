export interface ConnectionManagerOptions {
    url: string;
    reconnectStrategy?: ReconnectStrategy;
    maxReconnectAttempts?: number;
}
export interface ReconnectStrategy {
    nextDelay(attempt: number): number;
    shouldRetry(attempt: number): boolean;
}
export declare enum ChannelType {
    Consumer = "consumer",
    Publisher = "publisher"
}
