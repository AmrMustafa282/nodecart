# User Service

User profile and preferences management service using PostgreSQL.

## Features

- User profile management (CRUD)
- Address book management
- User preferences (language, currency, notifications)
- Event-driven user creation (listens to user.registered)
- PostgreSQL with Sequelize ORM
- Soft delete support

## API Endpoints

### User Profile
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account

### Address Book
- `GET /api/addresses` - Get all addresses
- `GET /api/addresses/:id` - Get single address
- `POST /api/addresses` - Create new address
- `PUT /api/addresses/:id` - Update address
- `DELETE /api/addresses/:id` - Delete address

### Admin
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)

## Environment Variables

See `.env.example` for required configuration.

## Database Migrations

```bash
npm run migrate
```

## Running Locally

```bash
npm install
npm run dev
```

## API Documentation

Swagger UI available at: http://localhost:3002/api-docs
