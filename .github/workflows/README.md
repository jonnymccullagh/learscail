# GitHub Actions Workflows

This directory contains CI/CD workflows for the Léarscáil project.

## Workflows

### 1. `docker-hub-build-push.yml` - Docker Hub Deployment

Builds and pushes Docker images to Docker Hub for both frontend and backend.

**Triggers:**
- Push to `main` branch
- Push of version tags (v*)
- Manual dispatch

**What it does:**
1. Reads version from `VERSION.txt` files
2. Builds frontend Docker image from `docker/Dockerfile`
3. Builds backend Docker image from `docker/backend.Dockerfile`
4. Pushes to Docker Hub with version tag and `latest` tag
5. Builds for both `linux/amd64` and `linux/arm64` platforms

**Images published:**
- `redbranch/learscail-frontend:<version>`
- `redbranch/learscail-frontend:latest`
- `redbranch/learscail-backend:<version>`
- `redbranch/learscail-backend:latest`

### 2. `docker-build-push.yml` - GitHub Container Registry (Legacy)

Builds and pushes to GitHub Container Registry (ghcr.io). May be deprecated in favor of Docker Hub workflow.

### 3. `tauri-build.yml` - Desktop App Build

Builds the Tauri desktop application for multiple platforms.

## Required Secrets

You need to configure these secrets in your GitHub repository settings:

### Go to: Settings → Secrets and variables → Actions → Secrets

#### Docker Hub Authentication (Required for docker-hub-build-push.yml)

1. **`DOCKERHUB_USERNAME`**
   - Your Docker Hub username
   - Example: `redbranch`

2. **`DOCKERHUB_TOKEN`**
   - Docker Hub access token (not your password!)
   - How to create:
     1. Log in to [Docker Hub](https://hub.docker.com/)
     2. Go to Account Settings → Security → New Access Token
     3. Create a token with Read & Write permissions
     4. Copy the token and save it as this secret

## Required Variables (Optional)

### Go to: Settings → Secrets and variables → Actions → Variables

1. **`VITE_BACKEND_URL`** (optional)
   - Backend URL for the frontend to connect to
   - Default: `http://localhost:3001`
   - Production example: `https://api.learscail.ie`

## Setup Instructions

### 1. Set up Docker Hub

```bash
# Create Docker Hub account at https://hub.docker.com if needed
# Create repository: redbranch/learscail-frontend
# Create repository: redbranch/learscail-backend
```

### 2. Create Docker Hub Access Token

1. Log in to Docker Hub
2. Account Settings → Security → New Access Token
3. Name: "GitHub Actions - Léarscáil"
4. Permissions: Read & Write
5. Copy the generated token

### 3. Add Secrets to GitHub

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add `DOCKERHUB_USERNAME` with your Docker Hub username
5. Add `DOCKERHUB_TOKEN` with the access token from step 2

### 4. (Optional) Configure Backend URL

If deploying to production with a custom backend URL:

1. Settings → Secrets and variables → Actions → Variables tab
2. Click "New repository variable"
3. Add `VITE_BACKEND_URL` with your backend URL (e.g., `https://api.learscail.ie`)

### 5. Test the Workflow

Push to main branch or manually trigger the workflow:

1. Go to Actions tab in GitHub
2. Select "Build and Push to Docker Hub"
3. Click "Run workflow" → "Run workflow"
4. Wait for the build to complete
5. Check Docker Hub for your images

## Version Management

The workflow automatically reads version numbers from:
- `frontend/VERSION.txt`
- `backend/VERSION.txt`

These are auto-incremented by the git pre-commit hook. The Docker images will be tagged with these versions.

Example:
- If `frontend/VERSION.txt` contains `2.0.5`
- Images will be tagged as `redbranch/learscail-frontend:2.0.5` and `redbranch/learscail-frontend:latest`

## Deployment

After the workflow runs successfully, you can pull and run the images:

```bash
# Pull specific version
docker pull redbranch/learscail-frontend:2.0.5
docker pull redbranch/learscail-backend:2.0.5

# Or pull latest
docker pull redbranch/learscail-frontend:latest
docker pull redbranch/learscail-backend:latest

# Run frontend
docker run -d -p 80:80 redbranch/learscail-frontend:latest

# Run backend (with environment variables)
docker run -d -p 3001:3001 \
  -e LOGAINM_API_KEY=your_key \
  -e GEOGRAPH_API_KEY=your_key \
  -e GRAPHHOPPER_API_KEY=your_key \
  redbranch/learscail-backend:latest
```

## Troubleshooting

### Build fails with "unauthorized: authentication required"

- Check that `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Verify the Docker Hub token has Read & Write permissions
- Ensure the token hasn't expired

### Images not appearing in Docker Hub

- Check that the repositories exist on Docker Hub:
  - `redbranch/learscail-frontend`
  - `redbranch/learscail-backend`
- Verify workflow completed successfully in Actions tab
- Check workflow logs for errors

### Multi-platform build fails

- This is sometimes due to QEMU/buildx issues in GitHub Actions
- Check the build logs for specific platform errors
- Can temporarily remove one platform if needed in the workflow file

## Multi-platform Support

The workflow builds images for both:
- `linux/amd64` (Intel/AMD processors)
- `linux/arm64` (ARM processors, including Apple Silicon, Raspberry Pi, AWS Graviton)

This allows the images to run on a wide variety of servers and cloud platforms.
