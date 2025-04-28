import { Subscriber, Publisher } from "binding/binder/decorators";

export class UserService {
  @Subscriber("userCreatedInput")
  async handleUserCreated(event: any) {
    console.log("Received user created event", event);
  }

  @Publisher("userPublisher")
  async createUser(data: any) {
    return { id: "123", ...data };
  }
}

export default new UserService();
