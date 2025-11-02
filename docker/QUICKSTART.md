# Quick Start - Production Deployment

Deploy Léarscáil in 5 minutes with Docker + Nginx.

## Prerequisites

- Server with Docker and Docker Compose
- Domain name pointed to your server
- API keys (Logainm, Geograph, GraphHopper)

## Step 1: Configure Environment

```bash
cd docker
cp .env.example .env
nano .env
```

Add your API keys:
```bash
LOGAINM_API_KEY=your_key
GEOGRAPH_API_KEY=your_key
GRAPHHOPPER_API_KEY=your_key
FRONTEND_URL=https://yourdomain.com
```

## Step 2: Start Services

```bash
docker-compose up -d
```

Verify:
```bash
docker-compose ps
curl http://localhost:8080  # Frontend
curl http://localhost:3001/health  # Backend
```

## Step 3: Configure Nginx

```bash
# Install nginx
sudo apt install nginx

# Copy config
sudo cp nginx-reverse-proxy.conf /etc/nginx/sites-available/learscail

# Edit domain name
sudo nano /etc/nginx/sites-available/learscail
# Replace 'learscail.ie' with your domain

# Enable site
sudo ln -s /etc/nginx/sites-available/learscail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 4: Set Up SSL (Optional but Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Update .env with HTTPS URL
FRONTEND_URL=https://yourdomain.com

# Restart backend
docker-compose restart backend
```

## Done!

Visit your domain: `https://yourdomain.com`

## Update to New Version

```bash
cd docker
docker-compose pull
docker-compose up -d
```

## Troubleshooting

**View logs:**
```bash
docker-compose logs -f
```

**Restart services:**
```bash
docker-compose restart
```

**Check nginx:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
