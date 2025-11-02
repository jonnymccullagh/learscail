# Deployment Guide

This guide covers deploying Léarscáil to production environments.

## Docker Hub Images

The application is automatically built and pushed to Docker Hub when code is pushed to the `main` branch.

### Available Images

- **Frontend:** `redbranch/learscail-frontend:<version>`
- **Backend:** `redbranch/learscail-backend:<version>`

Both images are also tagged with `:latest`.

## Quick Start with Docker

### Pull Images

```bash
# Pull latest versions
docker pull redbranch/learscail-frontend:latest
docker pull redbranch/learscail-backend:latest

# Or pull specific versions
docker pull redbranch/learscail-frontend:2.0.0
docker pull redbranch/learscail-backend:2.0.0
```

### Run Backend

```bash
docker run -d \
  --name learscail-backend \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e LOGAINM_API_KEY=your_logainm_key \
  -e GEOGRAPH_API_KEY=your_geograph_key \
  -e GRAPHHOPPER_API_KEY=your_graphhopper_key \
  -e FRONTEND_URL=https://learscail.ie \
  redbranch/learscail-backend:latest
```

### Run Frontend

```bash
docker run -d \
  --name learscail-frontend \
  -p 80:80 \
  redbranch/learscail-frontend:latest
```

## Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: redbranch/learscail-backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - LOGAINM_API_KEY=${LOGAINM_API_KEY}
      - GEOGRAPH_API_KEY=${GEOGRAPH_API_KEY}
      - GRAPHHOPPER_API_KEY=${GRAPHHOPPER_API_KEY}
      - FRONTEND_URL=https://learscail.ie
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3

  frontend:
    image: redbranch/learscail-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Create `.env` file with your API keys:

```env
LOGAINM_API_KEY=your_key_here
GEOGRAPH_API_KEY=your_key_here
GRAPHHOPPER_API_KEY=your_key_here
```

Run with:

```bash
docker-compose up -d
```

## Kubernetes Deployment

Example Kubernetes manifests:

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learscail-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: learscail-backend
  template:
    metadata:
      labels:
        app: learscail-backend
    spec:
      containers:
      - name: backend
        image: redbranch/learscail-backend:2.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOGAINM_API_KEY
          valueFrom:
            secretKeyRef:
              name: learscail-secrets
              key: logainm-api-key
        - name: GEOGRAPH_API_KEY
          valueFrom:
            secretKeyRef:
              name: learscail-secrets
              key: geograph-api-key
        - name: GRAPHHOPPER_API_KEY
          valueFrom:
            secretKeyRef:
              name: learscail-secrets
              key: graphhopper-api-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: learscail-backend
spec:
  selector:
    app: learscail-backend
  ports:
  - port: 3001
    targetPort: 3001
```

### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learscail-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: learscail-frontend
  template:
    metadata:
      labels:
        app: learscail-frontend
    spec:
      containers:
      - name: frontend
        image: redbranch/learscail-frontend:2.0.0
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: learscail-frontend
spec:
  selector:
    app: learscail-frontend
  ports:
  - port: 80
    targetPort: 80
```

## Cloud Platform Specific Guides

### Google Cloud Run

#### Deploy Backend

```bash
gcloud run deploy learscail-backend \
  --image redbranch/learscail-backend:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "LOGAINM_API_KEY=logainm-key:latest,GEOGRAPH_API_KEY=geograph-key:latest,GRAPHHOPPER_API_KEY=graphhopper-key:latest"
```

#### Deploy Frontend

```bash
gcloud run deploy learscail-frontend \
  --image redbranch/learscail-frontend:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

### AWS ECS

Use the AWS Console or CLI to create ECS tasks using the Docker Hub images.

### DigitalOcean App Platform

Connect your Docker Hub repository and deploy directly from the App Platform UI.

## Environment Variables

### Backend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Node environment | `production` |
| `PORT` | No | Server port | `3001` |
| `FRONTEND_URL` | No | Frontend URL for CORS | `https://learscail.ie` |
| `LOGAINM_API_KEY` | Yes | Logainm API key | `your_key` |
| `GEOGRAPH_API_KEY` | Yes | Geograph API key | `your_key` |
| `GRAPHHOPPER_API_KEY` | Yes | GraphHopper API key | `your_key` |

### Frontend

The frontend is built at build-time with the backend URL. To change it, you need to rebuild with:

```bash
docker build -f docker/Dockerfile \
  --build-arg VITE_BACKEND_URL=https://api.learscail.ie \
  -t redbranch/learscail-frontend:custom \
  .
```

## Versioning

Docker images are tagged with version numbers from `VERSION.txt` files:

- `frontend/VERSION.txt` → `redbranch/learscail-frontend:<version>`
- `backend/VERSION.txt` → `redbranch/learscail-backend:<version>`

Versions are auto-incremented on each commit via git pre-commit hook.

To use a specific version in production:

```bash
docker pull redbranch/learscail-backend:2.0.15
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/docker-hub-build-push.yml`) automatically:

1. Triggers on push to `main` branch
2. Reads version from `VERSION.txt` files
3. Builds Docker images for both platforms (amd64, arm64)
4. Pushes to Docker Hub with version tag and `latest` tag

See `.github/workflows/README.md` for detailed setup instructions.

## Health Checks

Both services provide health check endpoints:

- **Backend:** `http://localhost:3001/health` - Returns 200 OK when healthy
- **Frontend:** `http://localhost/` - Returns 200 OK when nginx is serving

Use these for container orchestration health checks.

## Monitoring

Consider setting up:

- **Logging:** Aggregate logs from containers (use `docker logs` or cloud provider logging)
- **Metrics:** Monitor container CPU, memory, and request rates
- **Uptime:** Use health check endpoints with monitoring services like UptimeRobot, Pingdom, or Datadog

## Backup

No database backup needed - the application is stateless. User data (favorites, history, settings) is stored in browser localStorage.

## Scaling

Both frontend and backend are stateless and can be horizontally scaled:

```bash
docker-compose up -d --scale backend=3 --scale frontend=2
```

Or in Kubernetes, adjust the `replicas` field in deployments.

## Troubleshooting

### Backend not connecting to frontend

- Check `FRONTEND_URL` environment variable is set correctly for CORS
- Verify frontend is configured with correct backend URL

### API errors in backend

- Verify all API keys are set correctly
- Check backend logs: `docker logs learscail-backend`

### Version mismatch

- Check running versions: `docker ps`
- Compare with available versions: `docker images redbranch/learscail-*`
- Pull latest: `docker-compose pull`

## Security

### Production Checklist

- [ ] Use specific version tags, not `:latest` in production
- [ ] Store API keys in secrets management (not in code)
- [ ] Enable HTTPS/TLS with reverse proxy (nginx, Caddy, Traefik)
- [ ] Set up proper CORS configuration
- [ ] Enable rate limiting if needed
- [ ] Regular security updates (pull new images)
- [ ] Monitor for vulnerabilities with Docker Scout or Snyk

### Reverse Proxy Example (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name learscail.ie;

    ssl_certificate /etc/ssl/certs/learscail.crt;
    ssl_certificate_key /etc/ssl/private/learscail.key;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name api.learscail.ie;

    ssl_certificate /etc/ssl/certs/learscail.crt;
    ssl_certificate_key /etc/ssl/private/learscail.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
