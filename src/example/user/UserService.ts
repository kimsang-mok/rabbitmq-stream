import { Subscriber, Publisher } from "binding/binder/decorators";
import { LoggerFactory } from "logging/LoggerFactory";

export class UserService {
  private logger = LoggerFactory.createDefaultLogger(UserService.name);

  @Subscriber("userCreatedInput")
  async handleUserCreated(event: any) {
    this.logger.info("Received user created event: ", event);
  }

  @Publisher("userPublisher")
  async createUser(data: any) {
    this.logger.info("Publish user created event: ", data);
    return { id: "123", ...data };
  }
}

export default new UserService();
