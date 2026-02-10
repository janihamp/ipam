# Azure IPAM - Docker Deployment

This guide covers deploying Azure IPAM using Docker containers.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- Azure Service Principal with Reader access
- Azure AD App Registration for frontend authentication

## Quick Start

### 1. Configure Environment Variables

```bash
cd deploy/docker
cp .env.example .env
```

Edit `.env` with your Azure credentials:

```env
# Service Principal for API
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-sp-client-id
AZURE_CLIENT_SECRET=your-sp-secret

# App Registration for Frontend
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_AZURE_CLIENT_ID=your-app-registration-client-id
```

### 2. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access the Application

- **Frontend**: http://localhost:8080
- **API**: http://localhost:7071/api

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Frontend   │───▶│     API      │───▶│    Azure     │   │
│  │   (Nginx)    │    │  (Functions) │    │  Resources   │   │
│  │   :8080      │    │   :7071      │    │              │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_TENANT_ID` | Azure AD tenant ID | Yes |
| `AZURE_CLIENT_ID` | Service Principal client ID | Yes |
| `AZURE_CLIENT_SECRET` | Service Principal secret | Yes |
| `AZURE_SUBSCRIPTION_IDS` | Comma-separated subscription IDs (optional) | No |
| `VITE_AZURE_TENANT_ID` | Tenant ID for frontend auth | Yes |
| `VITE_AZURE_CLIENT_ID` | App Registration client ID | Yes |

### Local Development with Azurite

To include the Azure Storage emulator (Azurite):

```bash
docker-compose --profile local up -d
```

## Commands

```bash
# Build images
docker-compose build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (reset data)
docker-compose down -v

# Rebuild specific service
docker-compose build api
docker-compose up -d api
```

## Production Considerations

### Security

1. **Use Docker secrets** instead of environment variables for sensitive data
2. **Enable HTTPS** with a reverse proxy (Traefik, nginx-proxy, etc.)
3. **Restrict network access** using Docker network policies

### Scaling

For high availability, consider:

```bash
# Scale API instances (behind load balancer)
docker-compose up -d --scale api=3
```

### Monitoring

Add monitoring with:

```yaml
services:
  prometheus:
    image: prom/prometheus
    # ... configuration

  grafana:
    image: grafana/grafana
    # ... configuration
```

## Troubleshooting

### API won't start

```bash
# Check logs
docker-compose logs api

# Verify Azure credentials
docker-compose exec api env | grep AZURE
```

### Frontend can't reach API

```bash
# Check network connectivity
docker-compose exec frontend wget -O- http://api:7071/api/health

# Verify nginx config
docker-compose exec frontend cat /etc/nginx/nginx.conf
```

### Authentication Issues

1. Verify App Registration redirect URIs include `http://localhost:8080`
2. Check browser console for MSAL errors
3. Ensure tenant ID matches in both API and frontend configs

## Image Registry

To push to a container registry:

```bash
# Tag images
docker tag azure-ipam-api:latest myregistry.azurecr.io/azure-ipam-api:v1.0.0
docker tag azure-ipam-frontend:latest myregistry.azurecr.io/azure-ipam-frontend:v1.0.0

# Push to registry
docker push myregistry.azurecr.io/azure-ipam-api:v1.0.0
docker push myregistry.azurecr.io/azure-ipam-frontend:v1.0.0
```
