#!/bin/bash

# NodeCart Health Check Script
# Checks the health of all services

echo "===================="
echo "NodeCart Health Check"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_service() {
  local service_name=$1
  local url=$2

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

  if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓${NC} $service_name: OK"
  else
    echo -e "${RED}✗${NC} $service_name: FAILED (HTTP $response)"
  fi
}

echo "Checking Services..."
echo ""

# API Gateway
check_service "API Gateway" "http://localhost:3000/health"

# Microservices
check_service "Auth Service" "http://localhost:3001/health"
check_service "User Service" "http://localhost:3002/health"
check_service "Product Service" "http://localhost:3003/health"
check_service "Order Service" "http://localhost:3004/health"
check_service "Payment Service" "http://localhost:3005/health"
check_service "Notification Service" "http://localhost:3006/health"

echo ""
echo "Checking Infrastructure..."
echo ""

# Infrastructure
check_service "RabbitMQ Management" "http://localhost:15672"
check_service "Mailhog UI" "http://localhost:8025"
check_service "MinIO Console" "http://localhost:9001/minio/health/ready"
check_service "Kibana" "http://localhost:5601/api/status"
check_service "Grafana" "http://localhost:3030/api/health"
check_service "Prometheus" "http://localhost:9090/-/healthy"

echo ""
echo "===================="
echo "Health Check Complete"
echo "===================="
