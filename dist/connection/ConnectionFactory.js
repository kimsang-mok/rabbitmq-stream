"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionFactory = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
class ConnectionFactory {
    static async createConnection(url, options) {
        return amqplib_1.default.connect(url, options);
    }
}
exports.ConnectionFactory = ConnectionFactory;
