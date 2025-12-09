# Order Service

Order management and shopping cart service using MariaDB/MySQL.

## Features

- Shopping cart management
- Order creation and checkout
- Order tracking and status updates
- Order cancellation
- Event-driven payment integration
- Order history
- Admin order management

## API Endpoints

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:productId` - Update cart item
- `DELETE /api/cart/items/:productId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order from cart
- `PUT /api/orders/:id/cancel` - Cancel order
- `PUT /api/orders/:id/status` - Update order status (admin/vendor)
- `GET /api/orders/admin/all` - Get all orders (admin)

## Order Status Flow
1. **pending** - Order created, awaiting payment
2. **confirmed** - Payment successful
3. **processing** - Order being prepared
4. **shipped** - Order shipped
5. **delivered** - Order delivered
6. **cancelled** - Order cancelled
7. **refunded** - Order refunded

## Event Publishers
- `order.created` - When a new order is created
- `order.updated` - When order status changes
- `order.cancelled` - When order is cancelled
- `order.completed` - When payment is successful

## Event Subscribers
- `payment.success` - Updates order status to confirmed
- `payment.failed` - Marks payment as failed

## Environment Variables

See `.env.example` for required configuration.

## Running Locally

```bash
npm install
npm run dev
```

## API Documentation

Swagger UI available at: http://localhost:3004/api-docs
