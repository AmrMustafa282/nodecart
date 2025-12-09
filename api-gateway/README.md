# API Gateway (NGINX)

NGINX-based API Gateway for NodeCart microservices platform.

## Features

- Reverse proxy for all microservices
- Rate limiting per endpoint
- Load balancing (when scaling services)
- WebSocket support for real-time notifications
- Request logging
- Health check endpoint

## Routes

All routes are prefixed with `/api`:

```
/api/auth/*           → Auth Service (3001)
/api/users/*          → User Service (3002)
/api/addresses/*      → User Service (3002)
/api/products/*       → Product Service (3003)
/api/categories/*     → Product Service (3003)
/api/orders/*         → Order Service (3004)
/api/cart/*           → Order Service (3004)
/api/payments/*       → Payment Service (3005)
/api/webhooks/*       → Payment Service (3005)
/api/notifications/*  → Notification Service (3006)
/socket.io/*          → Notification Service WebSocket (3006)
```

## Rate Limiting

- **Auth endpoints**: 5 requests/second (burst: 10)
- **General endpoints**: 10 requests/second (burst: 20-30)
- **Product endpoints**: Higher burst (30) for browsing

## Health Check

```bash
curl http://localhost:3000/health
```

## Running Standalone

```bash
docker build -t nodecart-gateway -f api-gateway/Dockerfile .
docker run -p 3000:3000 --network nodecart-network nodecart-gateway
```

## Configuration

Edit `nginx.conf` to:
- Add/modify routes
- Adjust rate limiting
- Configure timeouts
- Add caching rules
- Enable SSL/TLS (production)

## Production Considerations

1. **SSL/TLS**: Add certificate configuration
2. **Caching**: Enable caching for static content
3. **Compression**: Enable gzip compression
4. **Security Headers**: Add additional security headers
5. **DDoS Protection**: Implement additional rate limiting
6. **Access Control**: Add IP whitelisting if needed
