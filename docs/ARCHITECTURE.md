# NodeCart Architecture

## Overview

NodeCart is a production-grade microservices-based e-commerce platform built with Node.js, implementing Clean Architecture principles and event-driven communication patterns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│                    (Web, Mobile, API Consumers)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (NGINX)                         │
│              Rate Limiting │ Load Balancing │ Routing           │
└───────────┬──────────┬──────────┬──────────┬──────────┬─────────┘
            │          │          │          │          │
    ┌───────▼─┐  ┌────▼────┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼─────────┐
    │  Auth   │  │  User   │ │ Product │ │  Order   │ │  Payment │
    │ Service │  │ Service │ │ Service │ │ Service  │ │ Service  │
    │(MongoDB)│  │(Postgres)│ │(MongoDB)│ │(MariaDB) │ │(MongoDB) │
    └────┬────┘  └────┬────┘ └────┬────┘ └────┬─────┘ └─────┬────┘
         │            │           │           │              │
         │            │           │           │              │
         └────────────┴───────────┴───────────┴──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │                             │
              ┌─────▼─────┐           ┌──────────▼─────────┐
              │ RabbitMQ  │           │   Notification     │
              │ (Events)  │           │    Service         │
              └───────────┘           │ (Email + WebSocket)│
                                      └────────────────────┘
```

## Components

### Microservices

#### 1. Auth Service (Port 3001)
- **Database**: MongoDB
- **Responsibilities**:
  - User registration and login
  - JWT access token (15min) and refresh token (7 days) generation
  - Password hashing (bcrypt)
  - Token refresh and validation
  - RBAC (Role-Based Access Control)
- **Events Published**:
  - `user.registered`

#### 2. User Service (Port 3002)
- **Database**: PostgreSQL
- **Responsibilities**:
  - User profile management
  - Address book management
  - User preferences
  - Account settings
- **Events Consumed**:
  - `user.registered` → Creates user profile

#### 3. Product Service (Port 3003)
- **Database**: MongoDB
- **Storage**: MinIO (S3-compatible)
- **Responsibilities**:
  - Product catalog management
  - Category management
  - Inventory tracking
  - Image upload to MinIO
  - Stock level monitoring
- **Events Published**:
  - `product.created`
  - `product.updated`
  - `product.lowstock`
  - `product.outofstock`
- **Events Consumed**:
  - `payment.success` → Reduces inventory

#### 4. Order Service (Port 3004)
- **Database**: MariaDB/MySQL
- **Responsibilities**:
  - Shopping cart management
  - Order creation and checkout
  - Order status tracking
  - Order history
- **Events Published**:
  - `order.created`
  - `order.updated`
  - `order.cancelled`
  - `order.completed`
- **Events Consumed**:
  - `payment.success` → Confirms order
  - `payment.failed` → Marks payment failed

#### 5. Payment Service (Port 3005)
- **Database**: MongoDB
- **Responsibilities**:
  - Payment processing (Mock Stripe/PayPal)
  - Transaction management
  - Payment status tracking
  - Refund processing
- **Events Published**:
  - `payment.initiated`
  - `payment.success`
  - `payment.failed`
  - `payment.refunded`
- **Events Consumed**:
  - `order.created` → Notified of new order

#### 6. Notification Service (Port 3006)
- **Database**: MongoDB
- **Communication**: Email (Mailhog) + WebSocket
- **Responsibilities**:
  - Email notifications
  - Real-time WebSocket push notifications
  - Notification history
  - Multi-channel delivery
- **Events Consumed**:
  - `user.registered` → Welcome email
  - `order.created` → Order confirmation
  - `payment.success` → Payment confirmation
  - `payment.failed` → Payment failure alert
  - `product.lowstock` → Admin alert

### Infrastructure Services

#### API Gateway (NGINX)
- **Port**: 3000
- **Features**:
  - Reverse proxy to microservices
  - Rate limiting (Redis-backed)
  - Request routing
  - WebSocket support
  - Load balancing

#### Message Broker (RabbitMQ)
- **Ports**: 5672 (AMQP), 15672 (Management UI)
- **Features**:
  - Event-driven communication
  - Dead letter queues
  - Message persistence
  - Retry with exponential backoff
  - Topic-based routing

#### Cache Layer (Redis)
- **Port**: 6379
- **Usage**:
  - Session storage
  - Rate limiting state
  - Cache layer
  - Distributed locks

#### Object Storage (MinIO)
- **Ports**: 9000 (API), 9001 (Console)
- **Usage**:
  - Product image storage
  - S3-compatible API
  - File management

#### Email Testing (Mailhog)
- **Ports**: 1025 (SMTP), 8025 (Web UI)
- **Usage**:
  - Email testing in development
  - Email preview and debugging

### Observability Stack

#### Logging (ELK Stack)
- **Elasticsearch** (9200, 9300): Log storage and search
- **Logstash** (5000): Log aggregation and processing
- **Kibana** (5601): Log visualization and analysis

#### Monitoring
- **Prometheus** (9090): Metrics collection
- **Grafana** (3030): Metrics visualization and dashboards

## Data Flow

### User Registration Flow
```
1. Client → API Gateway → Auth Service
2. Auth Service creates user
3. Auth Service publishes user.registered event
4. User Service consumes event, creates profile
5. Notification Service consumes event, sends welcome email
```

### Order Purchase Flow
```
1. Client adds items to cart (Order Service)
2. Client creates order (Order Service)
3. Order Service publishes order.created event
4. Client initiates payment (Payment Service)
5. Payment Service processes payment
6. On success:
   - Payment Service publishes payment.success event
   - Order Service updates order status
   - Product Service reduces inventory
   - Notification Service sends confirmation
7. On failure:
   - Payment Service publishes payment.failed event
   - Notification Service alerts user
```

## Communication Patterns

### Synchronous (REST)
- Client to Gateway
- Gateway to Services
- Used for: CRUD operations, queries

### Asynchronous (Events)
- Service to Service via RabbitMQ
- Used for: Cross-service notifications, eventual consistency

## Security

### Authentication
- JWT-based authentication
- Access tokens (short-lived, 15 minutes)
- Refresh tokens (long-lived, 7 days)
- Token blacklisting on logout

### Authorization
- Role-Based Access Control (RBAC)
- Roles: `user`, `vendor`, `admin`
- Ownership validation for resources

### Rate Limiting
- Redis-backed distributed rate limiting
- Different limits per endpoint type
- Prevents abuse and DDoS

### Data Protection
- Password hashing with bcrypt
- Environment-based secrets
- No sensitive data in logs

## Scalability

### Horizontal Scaling
- All services are stateless
- Can run multiple instances
- Load balancing via NGINX

### Database Scaling
- Each service has its own database
- No shared databases
- Can scale databases independently

### Caching
- Redis for frequently accessed data
- Reduces database load
- Improves response times

### Message Queue
- Decouples services
- Handles traffic spikes
- Retry mechanisms

## Deployment

### Development
```bash
docker-compose up --build
```

### Production Considerations
1. **Use orchestration**: Kubernetes, Docker Swarm
2. **Database replication**: Master-slave setup
3. **Load balancing**: Multiple gateway instances
4. **SSL/TLS**: Enable HTTPS
5. **Secrets management**: Vault, AWS Secrets Manager
6. **CDN**: For static assets
7. **Backups**: Automated database backups
8. **Monitoring**: Alert rules and on-call

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Auth Service DB | MongoDB |
| User Service DB | PostgreSQL |
| Product Service DB | MongoDB |
| Order Service DB | MariaDB/MySQL |
| Payment Service DB | MongoDB |
| Notification Service DB | MongoDB |
| Message Broker | RabbitMQ |
| Cache | Redis |
| Object Storage | MinIO (S3) |
| API Gateway | NGINX |
| Logging | ELK Stack |
| Monitoring | Prometheus + Grafana |
| Email Testing | Mailhog |
| Containerization | Docker |
| Orchestration | Docker Compose |

## Design Principles

1. **Microservices**: Each service is independent and deployable
2. **Event-Driven**: Async communication via events
3. **Database per Service**: No shared databases
4. **API Gateway Pattern**: Single entry point
5. **Clean Architecture**: Separation of concerns
6. **CQRS**: Command-Query Responsibility Segregation
7. **Circuit Breaker**: Fault tolerance (future enhancement)
8. **Service Discovery**: Via Docker networking
