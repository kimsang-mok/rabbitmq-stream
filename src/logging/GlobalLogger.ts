import winston from "winston";

export class GlobalLogger {
  private static loggerInstance: winston.Logger;

  static initialize(logLevel: string = "info") {
    if (!this.loggerInstance) {
      this.loggerInstance = winston.createLogger({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        defaultMeta: { framework: "MyMessagingFramework" },
        transports: [new winston.transports.Console()],
      });
    }
  }

  static getLogger(): winston.Logger {
    if (!this.loggerInstance) {
      throw new Error(
        "Logger not initialized. Call GlobalLogger.initialize() first."
      );
    }
    return this.loggerInstance;
  }
}
