# Learscail Backend API

Backend proxy service for Learscail that securely handles API requests to external services (Logainm, Geograph, GraphHopper) while keeping API keys private.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the example environment file and configure your API keys:
```bash
cp .env.example .env
```

3. Edit `.env` and add your API keys:
```
LOGAINM_API_KEY=your_actual_key
GEOGRAPH_API_KEY=your_actual_key
GRAPHHOPPER_API_KEY=your_actual_key
```

## Development

Start the development server with hot-reload:
```bash
npm run dev
```

The server will start on port 3001 (configurable via PORT in .env).

## Production

Build and run:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Returns server status

### Logainm
- `GET /api/logainm/search?query=<placename>&limit=10` - Search Irish placenames

### Geograph
- `GET /api/geograph/search?lat=<lat>&lon=<lon>&radius=1000&limit=10` - Search geotagged photos

### GraphHopper
- `POST /api/graphhopper/route` - Get routing directions
  ```json
  {
    "points": [[lon1, lat1], [lon2, lat2]],
    "profile": "car|bike|foot",
    "locale": "en"
  }
  ```
- `GET /api/graphhopper/geocode?q=<query>&limit=10` - Geocode addresses

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development|production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `LOGAINM_API_KEY` - Logainm API key
- `GEOGRAPH_API_KEY` - Geograph API key
- `GRAPHHOPPER_API_KEY` - GraphHopper API key

## Docker

See `../docker/backend.Dockerfile` for container deployment.
