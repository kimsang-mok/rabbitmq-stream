export interface ExchangeOptions {
  type?:
    | "direct"
    | "topic"
    | "headers"
    | "fanout"
    | "match"
    | "x-delayed-message";
  arguments?: Record<string, any>;
}
