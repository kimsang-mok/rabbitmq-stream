# RabbitMQ Stream

**A minimal yet powerful messaging framework for Node.js + RabbitMQ**, inspired by Spring Cloud Stream. Built on top of [`amqplib`](https://www.npmjs.com/package/amqplib), it provides a clean and declarative way to build event-driven applications with support for automatic retries, delayed messages, dead-letter queues, and connection recovery — all with simple configuration.

---

## ✨ Features

- **Declarative configuration** via `createMessagingContext`
- **Service decorators**: `@MessagingService`, `@Publisher`, and `@Consumer`
- **Automatic retries** with TTL queues and exponential backoff
- **Delayed messaging** via plugin or queue-based TTL + DLX strategy
- **Dead-letter (parking lot) support** after retry exhaustion
- **Auto-reconnection** with jittered/fixed/exponential strategies
- **Observability** via pluggable logger (log level control)
- **Minimal dependencies**, extensible by design

---

## Installation

```bash
npm install rabbitmq-stream
```

---

## Quick Start

This framework has two main components:

1. **Messaging Context** – Configures connections, queues, exchanges, and retry policies.
2. **Messaging Services** – Your business logic using decorators like `@Publisher` and `@Consumer`.

---

### Initialize Messaging Context

In your app entry point (`index.ts` or `main.ts`), set up the messaging context:

```tsx
import { createMessagingContext } from "rabbitmq-streamer";

createMessagingContext({
  connection: {
    uri: process.env.RABBITMQ_URI || "amqp://localhost",
    reconnectStrategy: "jittered",
    initialDelayMs: 1000,
    multiplier: 2,
    maxDelayMs: 30000,
    maxReconnectAttempts: 10,
  },
  binder: {
    // 👇 Define message consumers
    inputs: {
      userCreatedConsumer: {
        queue: "user.created.queue",
        exchange: "user.delayed.exchange",
        exchangeType: "x-delayed-message",
        exchangeArguments: {
          "x-delayed-type": "topic",
        },
        routingKey: "user.created",
        retry: {
          strategy: "exponential",
          maxAttempts: 5,
          backoffInitial: 1000,
          backoffMultiplier: 2,
          backoffMax: 10000,
        },
      },
    },

    // 👇 Define message publishers
    outputs: {
      userCreatedPublisher: {
        exchange: "user.delayed.exchange",
        exchangeType: "x-delayed-message",
        defaultRoutingKey: "user.created",
        delay: {
          strategy: "plugin",
          xDelayedType: "topic",
        },
      },
    },
  },
  observability: {
    logLevel: "info",
  },
});
```

### Define Messaging Services

Use decorators to turn regular methods into publishers or consumers.

```tsx
import { MessagingService, Publisher, Consumer } from "rabbitmq-stream";
import { UserCreatedEvent } from "./user.event";

@MessagingService()
export class UserService {
  // 👇 Publishes messages to the userCreatedPublisher output
  @Publisher("userCreatedPublisher")
  async createUser(data: UserCreatedEvent) {
    return {
      data,
      messageOptions: {
        delayMs: 5000,
        headers: {
          "x-trace-id": "abc123",
        },
        priority: 5,
      },
    };
  }

  // 👇 Consumes messages from the userCreatedConsumer input
  @Consumer("userCreatedConsumer")
  async handleUserCreated(event: UserCreatedEvent) {
    if (event.id === "1") {
      throw new Error(`Cannot process event: ${event}`);
    }

    console.log("Consumed UserCreatedEvent:", event);
  }
}
```

- `inputs` are **consumers**: define where your service listens.
- `outputs` are **publishers**: define where your messages are sent.
- Use `@Consumer` to consume messages, and `@Publisher` to emit them.
- Everything is bound automatically through `@MessagingService()`. This decorator marks class as a **messaging-aware service** that should be automactically registered into global messaging registry upon instantiation. It uses a pattern known as **subclass proxying** and is designed to be DI framework-agnostic.

---

## Retry Mechanism

Each input binding can define its own retry strategy:

```tsx
retry: {
  strategy: "exponential", // "fixed" | "exponential"
  maxAttempts: 5,
  backoffInitial: 1000,
  backoffMultiplier: 2,
  backoffMax: 10000,
}
```

Retries use TTL and DLX queues under the hood. After `maxAttempts`, failed messages are routed to a **parking lot queue** (e.g., `your.queue.retry.parkinglot`).

## Delayed Messaging

Supports two strategies:

### 1. **RabbitMQ Delayed Plugin**

```tsx
delay: {
  strategy: "plugin",
  xDelayedType: "topic"
}
```

> Allows per-message delay via publishOptions.delayMs.

#### Running RabbitMQ with the Delayed Message Plugin (Locally)

This script will:

- Build the `rabbitmq-delayed` image if it doesn't exist
- Start a container with default or custom credentials/ports

**Run with defaults**

```bash
bash docker/run-rabbitmq.sh
```

### 2. **Queue TTL + DLX**

You can configure delay queues (e.g., `queue.retry.5000`) and set TTL per queue for fixed-delay use cases.

## Connection Management

Built-in reconnection logic ensures your service remains available even when RabbitMQ goes down:

```tsx
connection: {
  uri: "amqp://localhost",
  reconnectStrategy: "jittered", // "fixed" | "exponential"
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
  maxReconnectAttempts: 10,
}
```

### Lifecycle Events

You can hook into connection lifecycle:

```tsx
connectionManager
  .on("connected", () => console.log("Connected to RabbitMQ"))
  .on("reconnecting", (attempt) => console.log(`Attempt ${attempt}`))
  .on("disconnected", (err) => console.error("Disconnected", err));
```

---

## Observability

Set the log level via:

```tsx
observability: {
  logLevel: "debug", // or "info", "warn", "error"
}
```

## Roadmap

- [ ] OpenTelemetry tracing
- [ ] Custom logger injection
- [ ] Metrics support

## 🙌 Contributing

Pull requests are welcome! If you’d like to extend this framework or fix bugs, open an issue or submit a PR. Let’s build a better messaging experience for Node.js together.
