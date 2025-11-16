# CloudAcademy Web APIs Microservice

FastAPI microservice for CloudAcademy web application APIs, focused on user progress tracking and course management.

## Features

- **User Progress API**: Get comprehensive user course progress and statistics
- **PostgreSQL Integration**: Async database connectivity with connection pooling
- **Production Ready**: Docker containerization, K8s deployment, health checks
- **Scalable**: Horizontal Pod Autoscaler configuration
- **Secure**: Non-root container, secret management, network policies

## API Endpoints

### Health & Info
- `GET /` - Service information
- `GET /health` - Health check for K8s probes

### User APIs
- `GET /api/users/me/progress?user_id={id}` - Get user course progress

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Web APIs        │────▶│   PostgreSQL    │
│  (Next.js)      │     │  Microservice    │     │   Database      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   K3s Cluster    │
                        │ web-api.cloudacademy.ar │
                        └──────────────────┘
```

## Development

### Prerequisites
- Python 3.11+
- PostgreSQL database
- Docker (for containerization)
- Kubernetes cluster (for deployment)

### Local Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables**
   ```bash
   export DB_HOST=localhost
   export DB_USER=postgres
   export DB_PASSWORD=your_password
   export DB_NAME=cloudacademy
   export DB_PORT=5432
   ```

3. **Run Development Server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Test API**
   ```bash
   curl http://localhost:8000/health
   curl "http://localhost:8000/api/users/me/progress?user_id=USER_ID"
   ```

## Database Schema

The service expects these PostgreSQL tables:

```sql
-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

-- User course progress table
CREATE TABLE user_course_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    course_id VARCHAR(255) NOT NULL,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### Docker Build
```bash
docker build -t registry.cloud-it.com.ar/cloudacademy-web-apis:latest .
docker push registry.cloud-it.com.ar/cloudacademy-web-apis:latest
```

### Kubernetes Deployment

1. **Create Database Secret**
   ```bash
   kubectl create secret generic cloudacademy-web-apis-secret -n cloudacademy \
     --from-literal=db-host=YOUR_DB_HOST \
     --from-literal=db-user=YOUR_DB_USER \
     --from-literal=db-password=YOUR_DB_PASSWORD \
     --from-literal=db-name=YOUR_DB_NAME \
     --from-literal=db-port=5432
   ```

2. **Deploy to K8s**
   ```bash
   cd k8s/
   ./deploy.sh
   ```

3. **Verify Deployment**
   ```bash
   kubectl get pods -n cloudacademy -l app=cloudacademy-web-apis
   kubectl logs -f deployment/cloudacademy-web-apis -n cloudacademy
   ```

### Production URLs
- **API Base**: `https://web-api.cloudacademy.ar`
- **Health Check**: `https://web-api.cloudacademy.ar/health`
- **User Progress**: `https://web-api.cloudacademy.ar/api/users/me/progress?user_id={id}`

## Monitoring

### Health Checks
The service provides comprehensive health checks:
- **Startup Probe**: Ensures service starts correctly
- **Liveness Probe**: Detects if service is running
- **Readiness Probe**: Determines if service can accept traffic

### Scaling
Horizontal Pod Autoscaler automatically scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Min replicas: 2, Max replicas: 10

### Logging
Structured logging with different levels:
- INFO: General service information
- WARNING: Non-critical issues
- ERROR: Critical errors requiring attention

## Security

- **Non-root Container**: Runs as user ID 1000
- **Secret Management**: Database credentials stored in K8s secrets
- **Network Policies**: Restricted network access
- **CORS**: Configured for specific domains only
- **TLS/SSL**: Automatic certificate management with Let's Encrypt

## Integration

### Frontend Integration
Update your frontend to use the new microservice:

```typescript
// Replace API Gateway URL with microservice URL
const apiUrl = 'https://web-api.cloudacademy.ar'
const response = await fetch(`${apiUrl}/api/users/me/progress?user_id=${userId}`)
```

### Service Discovery
Internal K8s service names:
- **ClusterIP**: `cloudacademy-web-apis-service.cloudacademy.svc.cluster.local`
- **Headless**: `cloudacademy-web-apis-headless.cloudacademy.svc.cluster.local`