# Notification Service

Notification service with email and WebSocket real-time push notifications.

## Features

- Email notifications via Mailhog (development) or SMTP (production)
- Real-time WebSocket push notifications
- Notification history and tracking
- Multiple notification channels (user_registered, order_created, payment, etc.)
- Email templates for various events
- Mark notifications as read
- Unread notifications count

## API Endpoints

### Notifications
- `GET /api/notifications` - Get all notifications for user
- `GET /api/notifications/:id` - Get single notification
- `GET /api/notifications/unread/count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/test` - Send test notification (development)

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3006', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events Received
- `notification` - General notification
- `order_created` - Order created
- `payment_success` - Payment successful
- `payment_failed` - Payment failed

### Subscribe to Channels
```javascript
socket.emit('subscribe', 'channel-name');
socket.emit('unsubscribe', 'channel-name');
```

## Email Templates

The service includes HTML email templates for:
- Welcome email (user registration)
- Order confirmation
- Payment confirmation
- Low stock alerts (admin)

## Event Subscribers

Listens to:
- `user.registered` - Sends welcome email
- `order.created` - Sends order confirmation
- `payment.success` - Sends payment confirmation email + WebSocket
- `payment.failed` - Sends failure notification via WebSocket
- `product.lowstock` - Sends low stock alert to admin

## Testing Emails

In development, all emails are captured by Mailhog:
- Access Mailhog UI: http://localhost:8025
- All sent emails appear there without being delivered

## Environment Variables

See `.env.example` for required configuration.

## Running Locally

```bash
npm install
npm run dev
```

## API Documentation

Swagger UI available at: http://localhost:3006/api-docs

## WebSocket Testing

Use the test endpoint to send a WebSocket notification:
```bash
POST /api/notifications/test
{
  "message": "Test notification"
}
```
