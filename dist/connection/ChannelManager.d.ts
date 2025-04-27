import { Channel, ChannelModel } from "amqplib";
import { ChannelType } from "./types";
export declare class ChannelManager {
    private connection;
    private consumerChannel?;
    private publisherChannel?;
    constructor(connection: ChannelModel);
    createChannels(): Promise<void>;
    getChannel(type: ChannelType): Channel;
    closeChannels(): Promise<void>;
}
