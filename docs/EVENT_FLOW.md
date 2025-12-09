# Event Flow Documentation

## Event-Driven Architecture

NodeCart uses RabbitMQ for asynchronous event-driven communication between microservices.

## Event Types

### User Events
- `user.registered`: Published when a new user registers
- `user.updated`: Published when user profile is updated
- `user.deleted`: Published when user account is deleted

### Order Events
- `order.created`: Published when a new order is placed
- `order.updated`: Published when order status changes
- `order.cancelled`: Published when order is cancelled
- `order.completed`: Published when order is delivered

### Payment Events
- `payment.initiated`: Published when payment processing starts
- `payment.success`: Published when payment is successful
- `payment.failed`: Published when payment fails
- `payment.refunded`: Published when payment is refunded

### Product Events
- `product.created`: Published when new product is added
- `product.updated`: Published when product is modified
- `product.lowstock`: Published when inventory falls below threshold
- `product.outofstock`: Published when inventory reaches zero

## Event Flow Diagrams

### User Registration Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/auth/register
     ▼
┌─────────────┐
│Auth Service │
│ (Publisher) │
└──────┬──────┘
       │ Publishes: user.registered
       │ {userId, email, role}
       ▼
  ┌─────────┐
  │RabbitMQ │
  │Exchange │
  └────┬────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌─────────────┐    ┌──────────────┐   ┌──────────┐
│User Service │    │Notification  │   │  Other   │
│ (Consumer)  │    │   Service    │   │ Services │
└──────┬──────┘    │  (Consumer)  │   └──────────┘
       │           └──────┬───────┘
       │                  │
       ▼                  ▼
Creates user         Sends welcome
profile in           email via
PostgreSQL          Mailhog
```

### Order Purchase Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. Add items to cart
     ▼
┌─────────────┐
│   Order     │
│  Service    │
└──────┬──────┘
       │ 2. POST /api/orders
       │
       ▼
┌─────────────┐
│   Order     │
│  Service    │
│ (Publisher) │
└──────┬──────┘
       │ Publishes: order.created
       │ {orderId, userId, items, total}
       ▼
  ┌─────────┐
  │RabbitMQ │
  └────┬────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌──────────────┐   ┌────────────┐   ┌──────────────┐
│   Payment    │   │Notification│   │   Product    │
│   Service    │   │  Service   │   │   Service    │
│  (Consumer)  │   │ (Consumer) │   │  (Consumer)  │
└──────┬───────┘   └─────┬──────┘   └──────────────┘
       │                 │
       │ 3. Process       │ Sends notification
       │    payment       │
       ▼                 │
┌──────────────┐         │
│   Payment    │         │
│   Service    │         │
│  (Publisher) │         │
└──────┬───────┘         │
       │ 4. Publishes:    │
       │    payment.success │
       │    {orderId, transactionId}
       ▼                 │
  ┌─────────┐           │
  │RabbitMQ │           │
  └────┬────┘           │
       │                 │
       ├─────────────────┼──────────────┐
       ▼                 ▼              ▼
┌──────────────┐   ┌────────────┐  ┌──────────────┐
│   Order      │   │Notification│  │   Product    │
│   Service    │   │  Service   │  │   Service    │
│  (Consumer)  │   │ (Consumer) │  │  (Consumer)  │
└──────┬───────┘   └─────┬──────┘  └──────┬───────┘
       │                 │                │
       │ Updates         │ Sends          │ Reduces
       │ order status    │ confirmation   │ inventory
       │ to confirmed    │ email          │
       ▼                 ▼                ▼
```

### Inventory Update Flow

```
┌──────────────┐
│   Payment    │
│   Service    │
│  (Publisher) │
└──────┬───────┘
       │ Publishes: payment.success
       │ {orderId, items[{productId, quantity}]}
       ▼
  ┌─────────┐
  │RabbitMQ │
  └────┬────┘
       │
       ▼
┌──────────────┐
│   Product    │
│   Service    │
│  (Consumer)  │
└──────┬───────┘
       │ For each item:
       │ 1. Reduce quantity
       │ 2. Check stock level
       ▼
┌──────────────┐
│  If quantity │
│  <= threshold│
└──────┬───────┘
       │ Publishes: product.lowstock
       │ {productId, name, quantity, threshold}
       ▼
  ┌─────────┐
  │RabbitMQ │
  └────┬────┘
       │
       ▼
┌──────────────┐
│Notification  │
│   Service    │
│  (Consumer)  │
└──────┬───────┘
       │ Sends low stock
       │ alert email to admin
       ▼
```

## Queue Configuration

### Exchange
- **Name**: `nodecart_events`
- **Type**: `topic`
- **Durable**: `true`
- **Auto-delete**: `false`

### Queues

#### notification-service-queue
- **Bindings**:
  - `user.registered`
  - `order.created`
  - `payment.success`
  - `payment.failed`
  - `product.lowstock`
- **DLX**: `nodecart_events_dlx`
- **TTL**: 24 hours

#### user-service-queue
- **Bindings**:
  - `user.registered`
- **DLX**: `nodecart_events_dlx`
- **TTL**: 24 hours

#### product-service-queue
- **Bindings**:
  - `payment.success`
- **DLX**: `nodecart_events_dlx`
- **TTL**: 24 hours

#### order-service-queue
- **Bindings**:
  - `payment.success`
  - `payment.failed`
- **DLX**: `nodecart_events_dlx`
- **TTL**: 24 hours

#### payment-service-queue
- **Bindings**:
  - `order.created`
- **DLX**: `nodecart_events_dlx`
- **TTL**: 24 hours

## Retry Policy

### Automatic Retries
- **Max Retries**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **On Failure**: Message moved to Dead Letter Queue

### Dead Letter Queue
- Failed messages after 3 retries
- Manual review and reprocessing
- Monitoring and alerting

## Event Message Format

```json
{
  "eventType": "user.registered",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "auth-service"
}
```

## Best Practices

### Publishers
1. Always include all necessary data in events
2. Don't include sensitive information
3. Use consistent event naming
4. Log published events
5. Handle publishing failures gracefully

### Consumers
1. Implement idempotency
2. Validate incoming event data
3. Handle errors gracefully
4. Log consumed events
5. Acknowledge only after successful processing
6. Use transactions for database updates

## Monitoring

### Metrics to Track
- Event publish rate
- Event consume rate
- Queue depth
- Message age
- Failed message count
- Retry attempts
- Processing time

### Alerts
- Queue depth > 1000 messages
- DLQ has messages
- Consumer lag > 1 minute
- High error rate (> 5%)

## Testing Events

### Publish Test Event
```javascript
const { EventBus, eventTypes } = require('@nodecart/shared');

const eventBus = new EventBus();
await eventBus.connect();

await eventBus.publish(eventTypes.USER_REGISTERED, {
  userId: 'test-user-id',
  email: 'test@example.com',
  role: 'user'
});
```

### Monitor RabbitMQ
- Management UI: http://localhost:15672
- Username: `guest`
- Password: `guest`

### View Exchanges and Queues
- Navigate to "Exchanges" tab
- Navigate to "Queues" tab
- Monitor message rates
- View bindings
