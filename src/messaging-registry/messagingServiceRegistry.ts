const RegisteredMessagingServices: any[] = [];

export function registerMessagingService(serviceInstance: any) {
  RegisteredMessagingServices.push(serviceInstance);
}

export function getRegisteredMessagingServices() {
  return RegisteredMessagingServices;
}
