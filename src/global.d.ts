interface ExchangeOptions {
  type?:
    | "direct"
    | "topic"
    | "headers"
    | "fanout"
    | "match"
    | "x-delayed-message"
    | string;
  arguments?: Record<string, any>;
}
