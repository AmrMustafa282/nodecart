# NodeCart - Microservices E-Commerce Platform

Production-grade e-commerce platform built with Node.js microservices architecture, featuring event-driven communication, comprehensive monitoring, and containerized deployment.

## Architecture

### Microservices
- **Auth Service** - Authentication and authorization with JWT
- **User Service** - User profiles and address management (PostgreSQL)
- **Product Service** - Product catalog and inventory (MongoDB)
- **Order Service** - Shopping cart and order processing (MariaDB)
- **Payment Service** - Payment processing integration
- **Notification Service** - Email and push notifications

### Infrastructure
- **API Gateway** - NGINX reverse proxy with rate limiting
- **Message Broker** - RabbitMQ for asynchronous communication
- **Cache** - Redis for sessions and caching
- **Storage** - MinIO (S3-compatible) for file storage
- **Monitoring** - Prometheus and Grafana
- **Logging** - ELK Stack (Elasticsearch, Logstash, Kibana)
- **CI/CD** - GitHub Actions with automated testing and deployment

## Quick Start

### Prerequisites
- Docker & Docker Compose v2.0+
- Node.js v18+ (optional, for local development)
- Minimum 8GB RAM

### Installation

```bash
# Start all services
docker-compose up -d

# Check health
./scripts/health-check.sh

# View logs
docker-compose logs -f
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | - |
| RabbitMQ | http://localhost:15672 | guest / guest |
| Mailhog | http://localhost:8025 | - |
| MinIO | http://localhost:9001 | minioadmin / minioadmin |
| Kibana | http://localhost:5601 | - |
| Grafana | http://localhost:3030 | admin / admin |
| Prometheus | http://localhost:9090 | - |

## API Documentation

All APIs are accessible through the API Gateway at `http://localhost:3000/api/*`

### Authentication
```bash
# Register
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "role": "user"
}

# Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

### Products
```bash
# List products
GET /api/products?page=1&limit=20

# Create product (requires vendor role)
POST /api/products
{
  "name": "Product Name",
  "description": "Description",
  "price": 99.99,
  "quantity": 100
}
```

### Orders
```bash
# Add to cart
POST /api/cart/items

# Create order
POST /api/orders

# Get order status
GET /api/orders/:id
```

## Event-Driven Architecture

Services communicate asynchronously via RabbitMQ:

- `user.registered` - Triggers welcome email
- `order.created` - Initiates payment processing
- `payment.success` - Updates order status and reduces inventory
- `payment.failed` - Cancels order
- `product.lowstock` - Sends notification alert

## Testing

```bash
# Run unit tests
cd services/auth-service && npm test

# Run all service tests
./scripts/health-check.sh

# Integration tests
docker-compose up -d && ./scripts/health-check.sh
```

## CI/CD Pipeline

GitHub Actions automatically:
- Runs unit tests for all services
- Builds Docker images
- Executes integration tests
- Performs security scans
- Deploys to Docker Hub (main branch)

See `.github/workflows/` for pipeline configuration.

## Development

### Project Structure
```
NodeCart/
├── services/           # Microservices
│   ├── auth-service/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   ├── payment-service/
│   └── notification-service/
├── shared/             # Shared libraries
├── api-gateway/        # NGINX configuration
├── infrastructure/     # Monitoring configs
└── docs/              # Documentation
```

### Environment Variables

Each service requires specific environment variables. See individual service README files or `.env.example`.

Key variables:
- `JWT_SECRET` - JWT signing secret
- `MONGODB_URI` - MongoDB connection string
- `POSTGRES_URI` - PostgreSQL connection string
- `REDIS_URL` - Redis connection URL
- `RABBITMQ_URL` - RabbitMQ connection URL

## Deployment

```bash
# Stop services
docker-compose down

# Clean volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

For production deployment, see `docs/DEPLOYMENT.md`.

## Monitoring

- **Logs**: Kibana at http://localhost:5601
- **Metrics**: Grafana at http://localhost:3030
- **Health**: Built-in health checks at `/health` endpoints
- **Traces**: Check RabbitMQ management console for message flows

## Security

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting on API Gateway
- Input validation and sanitization
- SQL injection protection
- XSS prevention
- Dependency scanning via Dependabot
- Container scanning via Trivy

## Documentation

- `docs/ARCHITECTURE.md` - Detailed architecture documentation
- `docs/EVENT_FLOW.md` - Event-driven communication flows
- `docs/CICD.md` - CI/CD pipeline documentation
- `docs/DEPLOYMENT.md` - Deployment guide
- Service READMEs - Individual service documentation

## Technology Stack

**Backend**: Node.js, Express
**Databases**: MongoDB, PostgreSQL, MariaDB
**Cache**: Redis
**Message Queue**: RabbitMQ
**API Gateway**: NGINX
**Monitoring**: Prometheus, Grafana, ELK Stack
**Storage**: MinIO (S3-compatible)
**CI/CD**: GitHub Actions
**Containers**: Docker, Docker Compose
