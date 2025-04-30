import { Logger } from "./types";
import { GlobalLogger } from "./GlobalLogger";

/**
 * LoggerFactory sets up a Winston logger with sensible defaults.
 * It produces JSON-formatted logs with timestamp and supports various levels.
 */
export class LoggerFactory {
  static createDefaultLogger(context: string): Logger {
    // default logger with timestamp and JSON format for production use&#8203;:contentReference[oaicite:1]{index=1}
    const baseLogger = GlobalLogger.getLogger();

    return baseLogger.child({ context });
  }
}
