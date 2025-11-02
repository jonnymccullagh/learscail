# Quick Start Guide

This guide will help you get Learscail running locally with both the frontend and backend.

## Prerequisites

- Node.js 20+ and npm
- Your API keys for:
  - Logainm (Irish placenames)
  - Geograph (geotagged photos)
  - GraphHopper (routing)

## Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure API keys
cp .env.example .env
# Edit .env and add your API keys
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure backend URL (optional - defaults to http://localhost:3001)
echo "VITE_BACKEND_URL=http://localhost:3001" > .env
```

## Running Locally

You'll need two terminal windows:

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

The backend will start on **http://localhost:3001**

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on **http://localhost:5173** (or similar)

## Running with Docker

If you prefer to use Docker:

```bash
cd docker

# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Start services
docker-compose up backend dev
```

Access the app at **http://localhost:5173**

## Architecture

The application has two main components:

1. **Backend API** (Port 3001)
   - TypeScript Express server
   - Proxies requests to external APIs (Logainm, Geograph, GraphHopper)
   - Keeps API keys private

2. **Frontend** (Port 5173 in dev, 8080 in production)
   - React + TypeScript
   - Leaflet for mapping
   - Communicates with backend API

## Privacy Note

Currently, most map data and tiles are still loaded from external services (OpenStreetMap, etc.). The backend only proxies the three services that require API keys. User privacy is maintained as:

- Map interactions happen locally in the browser
- External API calls go through your own backend
- No user tracking or analytics

## Next Steps

- See `backend/README.md` for backend API documentation
- See `frontend/README.md` for frontend development guide
- See `docker/README.md` for Docker deployment options
