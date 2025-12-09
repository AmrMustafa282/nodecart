# Auth Service

Authentication and authorization service for NodeCart platform.

## Features

- User registration and login
- JWT access tokens (15 minutes)
- Refresh tokens (7 days)
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Token blacklisting on logout
- Rate limiting for auth endpoints
- Event publishing (user.registered)

## API Endpoints

### Public
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Protected
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/change-password` - Change password

## Environment Variables

See `.env.example` for required configuration.

## Running Locally

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
npm run test:coverage
```

## API Documentation

Swagger UI available at: http://localhost:3001/api-docs
