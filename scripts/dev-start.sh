#!/bin/bash

# NodeCart Development Startup Script

echo "===================="
echo "Starting NodeCart Platform"
echo "===================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start services
echo "Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 30

# Check health
echo ""
./scripts/health-check.sh

echo ""
echo "===================="
echo "NodeCart is running!"
echo "===================="
echo ""
echo "Service URLs:"
echo "  API Gateway: http://localhost:3000"
echo "  RabbitMQ Management: http://localhost:15672"
echo "  Mailhog: http://localhost:8025"
echo "  MinIO Console: http://localhost:9001"
echo "  Kibana: http://localhost:5601"
echo "  Grafana: http://localhost:3030"
echo "  Prometheus: http://localhost:9090"
echo ""
echo "View logs: docker-compose logs -f [service-name]"
echo "Stop all: docker-compose down"
echo "===================="
