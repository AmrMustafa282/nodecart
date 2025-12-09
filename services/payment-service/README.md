# Payment Service

Payment processing service with mock Stripe, PayPal, and credit card integration.

## Features

- Mock payment processing (Stripe, PayPal, Credit Card)
- Payment status tracking
- Refund processing
- Webhook endpoints for payment providers
- Event-driven architecture
- Payment statistics and reporting
- Configurable success/failure rates for testing

## API Endpoints

### Payments
- `GET /api/payments` - Get all payments for user
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Process payment
- `POST /api/payments/:id/refund` - Refund payment (admin)
- `GET /api/payments/admin/stats` - Get payment statistics (admin)

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paypal` - PayPal webhook handler

## Payment Providers

### Stripe (Mock)
```json
{
  "provider": "stripe",
  "paymentMethod": {
    "card": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2025,
      "cvc": "123"
    }
  }
}
```

### PayPal (Mock)
```json
{
  "provider": "paypal",
  "paymentMethod": {
    "orderId": "paypal_order_id"
  }
}
```

### Credit Card (Mock)
```json
{
  "provider": "credit_card",
  "paymentMethod": {
    "number": "4242424242424242",
    "expiry": "12/25",
    "cvv": "123",
    "name": "John Doe"
  }
}
```

## Payment Status Flow
1. **pending** - Payment created
2. **processing** - Payment being processed
3. **completed** - Payment successful
4. **failed** - Payment failed
5. **refunded** - Payment refunded
6. **cancelled** - Payment cancelled

## Event Publishers
- `payment.initiated` - When payment processing starts
- `payment.success` - When payment is successful
- `payment.failed` - When payment fails
- `payment.refunded` - When payment is refunded

## Event Subscribers
- `order.created` - Listens for new orders

## Testing

### Force Payment Failure
Use card number `4000000000000002` to simulate a declined payment.

### Configure Success Rate
Set `PAYMENT_SUCCESS_RATE` environment variable (0.0 to 1.0) to control success rate for testing.

## Environment Variables

See `.env.example` for required configuration.

## Running Locally

```bash
npm install
npm run dev
```

## API Documentation

Swagger UI available at: http://localhost:3005/api-docs
