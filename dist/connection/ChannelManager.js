"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelManager = void 0;
const types_1 = require("./types");
class ChannelManager {
    constructor(connection) {
        this.connection = connection;
    }
    async createChannels() {
        this.consumerChannel = await this.connection.createChannel();
        this.publisherChannel = await this.connection.createConfirmChannel();
    }
    getChannel(type) {
        if (type === types_1.ChannelType.Consumer) {
            if (!this.consumerChannel)
                throw new Error("Connsumer channel not initialized");
            return this.consumerChannel;
        }
        if (!this.publisherChannel)
            throw new Error("Publisher channel not initialized");
        return this.publisherChannel;
    }
    async closeChannels() {
        await Promise.all([
            this.consumerChannel?.close().catch(() => { }),
            this.publisherChannel?.close().catch(() => { }),
        ]);
    }
}
exports.ChannelManager = ChannelManager;
