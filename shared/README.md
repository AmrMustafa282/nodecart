# @nodecart/shared

Shared utilities and middleware for NodeCart microservices platform.

## Installation

```bash
npm install
```

## Usage

```javascript
const {
  logger,
  authMiddleware,
  rbacMiddleware,
  EventBus,
  responseFormatter,
  AppError,
} = require('@nodecart/shared');

// Use in your Express app
app.use(authMiddleware);
app.use(rbacMiddleware(['admin']));

// Publish events
const eventBus = new EventBus();
await eventBus.connect();
await eventBus.publish('user.registered', { userId: 123 });

// Subscribe to events
await eventBus.subscribe('notification-queue', ['user.registered'], async (data) => {
  // Handle event
});

// Format responses
responseFormatter.success(res, data, 'User created');
```

## Features

- **JWT Authentication**: Token verification middleware
- **RBAC**: Role-based access control
- **Event Bus**: RabbitMQ wrapper with retry logic
- **Logger**: Winston with Elasticsearch integration
- **Rate Limiter**: Redis-backed rate limiting
- **Error Handler**: Centralized error handling
- **Response Formatter**: Consistent API responses
