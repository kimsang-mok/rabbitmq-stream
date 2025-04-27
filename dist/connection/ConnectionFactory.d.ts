import { ChannelModel, Options } from "amqplib";
export declare class ConnectionFactory {
    static createConnection(url: string, options?: Options.Connect): Promise<ChannelModel>;
}
