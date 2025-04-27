import amqp, { ChannelModel, Options } from "amqplib";

export class ConnectionFactory {
  static async createConnection(
    url: string,
    options?: Options.Connect
  ): Promise<ChannelModel> {
    return amqp.connect(url, options);
  }
}
