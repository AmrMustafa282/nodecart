#!/bin/bash

# Simple CI test script - mimics what GitHub Actions will do

set -e

echo "================================"
echo "Testing CI Pipeline Locally"
echo "================================"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Working directory: $PROJECT_ROOT"
echo ""

# Test 1: Validate Docker Compose
echo "Step 1: Validating Docker Compose configuration..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration has errors"
    exit 1
fi
echo ""

# Test 2: Build all services
services=("auth-service" "user-service" "product-service" "order-service" "payment-service" "notification-service")

echo "Step 2: Building Docker images..."
for service in "${services[@]}"; do
    echo "  Building $service..."
    if docker build -q -t nodecart-$service:test -f services/$service/Dockerfile . > /dev/null 2>&1; then
        echo "  ✅ $service"
    else
        echo "  ❌ $service failed to build"
        exit 1
    fi
done

echo "  Building api-gateway..."
if docker build -q -t nodecart-api-gateway:test -f api-gateway/Dockerfile . > /dev/null 2>&1; then
    echo "  ✅ api-gateway"
else
    echo "  ❌ api-gateway failed to build"
    exit 1
fi

echo ""
echo "================================"
echo "✅ All CI checks passed!"
echo "================================"
echo ""
echo "Your code is ready to push to GitHub."
echo "The CI pipeline will run the same checks."
