# Deployment Guide

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM
- 20GB+ available disk space

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/AmrMustafa282/nodecart
cd NodeCart
```

### 2. Start All Services
```bash
# Using helper script
./scripts/dev-start.sh

# Or manually
docker-compose up --build -d
```

### 3. Verify Health
```bash
./scripts/health-check.sh
```

### 4. Access Services

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| User Service | http://localhost:3002 |
| Product Service | http://localhost:3003 |
| Order Service | http://localhost:3004 |
| Payment Service | http://localhost:3005 |
| Notification Service | http://localhost:3006 |
| RabbitMQ Management | http://localhost:15672 |
| Mailhog UI | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |
| Kibana | http://localhost:5601 |
| Grafana | http://localhost:3030 |
| Prometheus | http://localhost:9090 |

## Development Workflow

### Start Infrastructure Only
```bash
docker-compose up -d redis rabbitmq mongodb mariadb postgres minio mailhog elasticsearch
```

### Run Services Locally
```bash
# Install dependencies
npm run install:all

# Start services in dev mode
npm run dev
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Follow logs
docker-compose logs -f --tail=100 auth-service
```

### Stop Services
```bash
# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Environment Variables

Each service has a `.env.example` file. For production:

1. Copy `.env.example` to `.env` in each service directory
2. Update values for production
3. Use secrets management (Vault, AWS Secrets Manager)

### Critical Variables to Change

```bash
# JWT Secrets (must be same across all services)
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>

# Database Passwords
DB_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-password>

# MinIO Credentials
MINIO_ROOT_USER=<username>
MINIO_ROOT_PASSWORD=<strong-password>

# Email Configuration (production SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=<smtp-user>
EMAIL_PASSWORD=<smtp-password>
```

## Production Deployment

### Option 1: Docker Swarm

#### Initialize Swarm
```bash
docker swarm init
```

#### Deploy Stack
```bash
docker stack deploy -c docker-compose.yml nodecart
```

#### Scale Services
```bash
docker service scale nodecart_auth-service=3
docker service scale nodecart_user-service=3
```

### Option 2: Kubernetes

#### Create Namespace
```bash
kubectl create namespace nodecart
```

#### Deploy Services
```bash
kubectl apply -f k8s/
```

#### Scale Deployments
```bash
kubectl scale deployment auth-service --replicas=3 -n nodecart
```

### Option 3: Cloud Platforms

#### AWS ECS
1. Build and push images to ECR
2. Create ECS cluster
3. Define task definitions
4. Create services
5. Configure Application Load Balancer

#### Google Cloud Run
1. Build and push images to GCR
2. Deploy each service to Cloud Run
3. Configure Cloud Load Balancer
4. Set up Cloud SQL for databases

#### Azure Container Instances
1. Build and push images to ACR
2. Create container groups
3. Configure Azure Load Balancer
4. Use Azure Database services

## Database Migrations

### PostgreSQL (User Service)
```bash
docker-compose exec user-service npm run migrate
```

### MariaDB (Order Service)
```bash
docker-compose exec order-service npm run migrate
```

## Backup and Restore

### MongoDB Backup
```bash
docker-compose exec mongodb mongodump --out=/backup
docker cp nodecart-mongodb:/backup ./backups/mongodb
```

### PostgreSQL Backup
```bash
docker-compose exec postgres pg_dump -U postgres user_db > backups/user_db.sql
```

### MariaDB Backup
```bash
docker-compose exec mariadb mysqldump -u root -p order_db > backups/order_db.sql
```

### MinIO Backup
```bash
docker-compose exec minio mc mirror /data /backup
```

## Monitoring Setup

### Prometheus Targets
Edit `infrastructure/prometheus/prometheus.yml` to add/modify targets

### Grafana Dashboards
1. Access Grafana: http://localhost:3030
2. Login: admin/admin
3. Import dashboards from `infrastructure/grafana/dashboards/`

### Kibana Setup
1. Access Kibana: http://localhost:5601
2. Create index pattern: `nodecart-logs-*`
3. Set time field: `@timestamp`

## SSL/TLS Configuration

### Generate Certificates
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx.key -out nginx.crt
```

### Update NGINX Configuration
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    ...
}
```

## Performance Tuning

### NGINX
- Enable gzip compression
- Configure caching
- Adjust worker processes
- Set connection limits

### Node.js
- Set `NODE_ENV=production`
- Enable clustering
- Configure memory limits
- Use PM2 for process management

### Databases
- Enable query caching
- Configure connection pooling
- Set up replication
- Regular vacuuming/optimization

### Redis
- Configure maxmemory
- Set eviction policies
- Enable persistence
- Monitor memory usage

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure firewalls
- [ ] Set up VPN for database access
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Use secrets management
- [ ] Enable CORS properly
- [ ] Sanitize user inputs
- [ ] Regular backups
- [ ] Disaster recovery plan

## Troubleshooting

### Services Won't Start
```bash
# Check Docker resources
docker system df

# View service logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>
```

### Database Connection Issues
```bash
# Check database container
docker-compose ps mongodb

# View database logs
docker-compose logs mongodb

# Access database shell
docker-compose exec mongodb mongosh
```

### RabbitMQ Issues
```bash
# Check RabbitMQ status
docker-compose exec rabbitmq rabbitmq-diagnostics status

# View queues
# Access http://localhost:15672
```

### Out of Memory
```bash
# Check container stats
docker stats

# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory
```

## Maintenance

### Update Dependencies
```bash
# Check outdated packages
npm outdated

# Update packages
npm update
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup
./scripts/clean.sh
```

### Log Rotation
Configure log rotation in production:
```bash
# /etc/logrotate.d/docker-containers
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review documentation in `/docs`
- Check service health: `./scripts/health-check.sh`
- RabbitMQ UI: http://localhost:15672
- Monitor Grafana: http://localhost:3030
