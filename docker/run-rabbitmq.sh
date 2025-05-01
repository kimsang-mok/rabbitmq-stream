#!/bin/bash

set -e

# configurable env vars with defaults
IMAGE_NAME="rabbitmq-delayed"
CONTAINER_NAME=${CONTAINER_NAME:-rabbitmq-delayed}
HOST_PORT=${HOST_PORT:-5672}
HOST_UI_PORT=${HOST_UI_PORT:-15672}
RABBIT_USER=${RABBITMQ_DEFAULT_USER:-guest}
RABBIT_PASS=${RABBITMQ_DEFAULT_PASS:-guest}

# check if the image exists
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  echo "Docker image '$IMAGE_NAME' not found. Building it now..."
  docker build -f docker/Dockerfile.rabbitmq -t "$IMAGE_NAME" .
else
  echo "Docker image '$IMAGE_NAME' already exists."
fi

# check if container already exists
if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
  echo "A container named '$CONTAINER_NAME' already exists."
  echo "Remove it with: docker rm -f $CONTAINER_NAME"
  exit 1
fi

echo "Starting RabbitMQ container '$CONTAINER_NAME'..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -e RABBITMQ_DEFAULT_USER="$RABBIT_USER" \
  -e RABBITMQ_DEFAULT_PASS="$RABBIT_PASS" \
  -p "$HOST_PORT":5672 \
  -p "$HOST_UI_PORT":15672 \
  "$IMAGE_NAME"

echo ""
echo "RabbitMQ is running!"
echo "AMQP: amqp://$RABBIT_USER:$RABBIT_PASS@localhost:$HOST_PORT"
echo "UI:   http://localhost:$HOST_UI_PORT (user: $RABBIT_USER)"

