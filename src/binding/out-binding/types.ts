export interface OutputBindingOptions {
  exchange: string;
  defaultRoutingKey?: string;
  exchangeType?: ExchangeOptions["type"];
}
