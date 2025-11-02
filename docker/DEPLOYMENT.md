# Deployment Guide - Docker + Nginx Reverse Proxy

This guide covers deploying Léarscáil with Docker Compose and Nginx reverse proxy.

## Architecture

```
Internet
    ↓
Nginx (Port 80/443)
    ├─→ Frontend (Port 8080) - Static files
    └─→ Backend (Port 3001)  - API endpoints
```

**User Flow:**
1. Browser requests `https://learscail.ie/` → Nginx → Frontend container → Serves HTML/JS/CSS
2. Browser JavaScript requests `/api/logainm/search` → Nginx → Backend container → External APIs

## Prerequisites

- Docker and Docker Compose installed
- Domain name (optional for production with SSL)
- API keys for Logainm, Geograph, and GraphHopper

## Step 1: Set Up Docker Environment

### 1.1 Create `.env` file

```bash
cd docker
cp .env.example .env
```

Edit `.env` with your API keys:

```bash
# Backend API Keys
LOGAINM_API_KEY=your_actual_logainm_key
GEOGRAPH_API_KEY=your_actual_geograph_key
GRAPHHOPPER_API_KEY=your_actual_graphhopper_key

# Frontend URL for CORS
FRONTEND_URL=https://learscail.ie  # Your production domain
```

### 1.2 Start Docker Compose

```bash
cd docker
docker-compose up -d
```

**Verify services are running:**

```bash
docker-compose ps

# Should show:
# learscail-backend    running    127.0.0.1:3001->3001/tcp
# learscail-web        running    127.0.0.1:8080->80/tcp
```

**Test directly (before nginx):**

```bash
# Test frontend
curl http://localhost:8080

# Test backend health
curl http://localhost:3001/health
```

## Step 2: Install and Configure Nginx

### 2.1 Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx
```

**CentOS/RHEL:**
```bash
sudo yum install nginx
```

**macOS:**
```bash
brew install nginx
```

### 2.2 Copy Nginx Configuration

```bash
sudo cp nginx-reverse-proxy.conf /etc/nginx/sites-available/learscail

# Edit the file to replace domain name
sudo nano /etc/nginx/sites-available/learscail
# Replace 'learscail.ie' with your actual domain
```

### 2.3 Enable the Site

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/learscail /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 3: Configure DNS

Point your domain to your server's IP address:

```
A    learscail.ie        →  YOUR_SERVER_IP
A    www.learscail.ie    →  YOUR_SERVER_IP
```

## Step 4: Set Up SSL with Let's Encrypt (Recommended)

### 4.1 Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install certbot python3-certbot-nginx
```

### 4.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d learscail.ie -d www.learscail.ie
```

Follow the prompts. Certbot will automatically:
- Obtain the certificate
- Update your nginx configuration
- Set up automatic renewal

### 4.3 Update Nginx Configuration for HTTPS

Edit `/etc/nginx/sites-available/learscail`:

1. Uncomment the HTTPS server block
2. Update SSL certificate paths if different
3. Update the HTTP server to redirect to HTTPS

```bash
sudo nano /etc/nginx/sites-available/learscail
```

Reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4.4 Update CORS Configuration

Update `docker/.env`:

```bash
FRONTEND_URL=https://learscail.ie
```

Restart backend:

```bash
cd docker
docker-compose restart backend
```

## Step 5: Verify Deployment

### 5.1 Test Frontend

Visit `https://learscail.ie` in your browser. You should see the Léarscáil application.

### 5.2 Test Backend API

Open browser dev tools (F12) → Network tab, then:

1. Search for a location
2. Check network requests - should see calls to `/api/logainm/search`, etc.
3. Verify responses are successful (200 OK)

### 5.3 Check Container Logs

```bash
cd docker

# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f web

# View all logs
docker-compose logs -f
```

## Step 6: Set Up Automatic Updates

### 6.1 Create Update Script

Create `/opt/learscail/update.sh`:

```bash
#!/bin/bash
set -e

echo "Updating Léarscáil..."

cd /path/to/your/learscail/docker

# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d

# Clean up old images
docker image prune -f

echo "Update complete!"
```

Make it executable:

```bash
chmod +x /opt/learscail/update.sh
```

### 6.2 Manual Updates

To update to a new version:

```bash
cd docker
docker-compose pull
docker-compose up -d
```

To update to a specific version:

```bash
# Edit docker-compose.yml and change:
# image: redbranch/learscail-frontend:latest
# to:
# image: redbranch/learscail-frontend:2.0.5

docker-compose up -d
```

## Monitoring and Maintenance

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
```

### Check Container Health

```bash
docker-compose ps

# Detailed health status
docker inspect learscail-backend | grep -A 10 Health
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down
```

## Firewall Configuration

Ensure only necessary ports are exposed:

**Using UFW (Ubuntu):**

```bash
# Allow SSH (be careful!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Ports 3001 and 8080 should NOT be accessible from the internet** - they're bound to 127.0.0.1 only.

## Backup Strategy

No database to backup - application is stateless. User data (favorites, history) is stored in browser localStorage.

**Configuration backup:**

```bash
# Backup .env file
cp docker/.env docker/.env.backup

# Backup nginx config
sudo cp /etc/nginx/sites-available/learscail /root/nginx-backup-$(date +%Y%m%d).conf
```

## Troubleshooting

### Frontend shows white page

1. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
2. Check if frontend container is running: `docker-compose ps`
3. Test direct access: `curl http://localhost:8080`

### API errors in browser

1. Open browser dev tools → Network tab
2. Check failed requests - look for CORS errors
3. Verify `FRONTEND_URL` in `.env` matches your domain
4. Check backend logs: `docker-compose logs backend`

### SSL certificate errors

1. Verify certificate is valid: `sudo certbot certificates`
2. Check nginx SSL configuration
3. Test SSL: `curl -v https://learscail.ie`

### Backend not responding

1. Check backend health: `curl http://localhost:3001/health`
2. Verify API keys are set in `.env`
3. Check backend logs: `docker-compose logs backend`

### Containers keep restarting

1. Check logs: `docker-compose logs`
2. Verify `.env` file exists with API keys
3. Check disk space: `df -h`
4. Check memory: `free -h`

## Performance Optimization

### Enable Gzip Compression

Add to nginx configuration:

```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### Enable HTTP/2

If using HTTPS, ensure nginx is configured for HTTP/2:

```nginx
listen 443 ssl http2;
```

### Rate Limiting

Add rate limiting to nginx to prevent abuse:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20;
    proxy_pass http://127.0.0.1:3001;
    # ... rest of config
}
```

## Security Checklist

- [ ] SSL/TLS enabled (HTTPS)
- [ ] Services bound to 127.0.0.1 (not 0.0.0.0)
- [ ] Firewall configured (only 80/443 exposed)
- [ ] API keys stored in .env (not in code)
- [ ] .env file permissions set to 600
- [ ] Nginx security headers enabled
- [ ] Regular updates: `docker-compose pull && docker-compose up -d`
- [ ] Certbot auto-renewal enabled: `sudo systemctl status certbot.timer`

## Production Environment Variables

**Required in `docker/.env`:**

```bash
# API Keys (required)
LOGAINM_API_KEY=xxx
GEOGRAPH_API_KEY=xxx
GRAPHHOPPER_API_KEY=xxx

# CORS (required for production)
FRONTEND_URL=https://learscail.ie
```

## Scaling (Optional)

For high traffic, you can run multiple instances:

```yaml
# In docker-compose.yml
services:
  backend:
    # ... existing config
    deploy:
      replicas: 3
```

Then use nginx upstream:

```nginx
upstream backend_cluster {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}
```

## Support

For issues:
- Check logs: `docker-compose logs`
- Review this guide
- Check GitHub issues: https://github.com/yourusername/learscail/issues
