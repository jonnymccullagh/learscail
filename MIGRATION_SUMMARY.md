# Frontend → Backend API Migration Summary

## What Changed

We've successfully migrated from **frontend calling APIs directly** to **frontend → backend → APIs**. This keeps your API keys private and secure.

### Before (Direct API Calls)
```
Frontend (Browser) → Logainm API (with exposed API key)
Frontend (Browser) → Geograph API (with exposed API key)
Frontend (Browser) → GraphHopper API (with exposed API key)
```

### After (Backend Proxy)
```
Frontend (Browser) → Backend (Port 3001) → Logainm API
Frontend (Browser) → Backend (Port 3001) → Geograph API
Frontend (Browser) → Backend (Port 3001) → GraphHopper API
```

## Files Changed

### Frontend

#### New Files
- ✅ `frontend/src/config/api.ts` - API endpoint configuration
- ✅ `frontend/test-backend.html` - Browser-based API tester

#### Modified Files
- ✅ `frontend/src/utils/logainm.ts` - Now calls `${BACKEND_URL}/api/logainm/search`
- ✅ `frontend/src/utils/geograph.ts` - Now calls `${BACKEND_URL}/api/geograph/search`
- ✅ `frontend/src/utils/routing.ts` - Now calls `${BACKEND_URL}/api/graphhopper/route`
- ✅ `frontend/.env` - Removed API keys, added `VITE_BACKEND_URL`
- ✅ `frontend/.env.example` - Updated to show new configuration

### Backend

#### New Files
- ✅ `backend/package.json` - Node dependencies
- ✅ `backend/tsconfig.json` - TypeScript configuration
- ✅ `backend/src/index.ts` - Express server main file
- ✅ `backend/src/config/index.ts` - Environment configuration
- ✅ `backend/src/middleware/errorHandler.ts` - Error handling
- ✅ `backend/src/routes/logainm.ts` - Logainm proxy endpoint
- ✅ `backend/src/routes/geograph.ts` - Geograph proxy endpoint
- ✅ `backend/src/routes/graphhopper.ts` - GraphHopper proxy endpoint
- ✅ `backend/.env` - API keys (private, not in git)
- ✅ `backend/.env.example` - Example configuration
- ✅ `backend/test-env.js` - Environment variable tester
- ✅ `backend/README.md` - Backend documentation
- ✅ `backend/DEBUG.md` - Debugging guide

### Docker

#### Modified Files
- ✅ `docker/docker-compose.yml` - Added backend service
- ✅ `docker/.env.example` - Updated for new architecture

#### New Files
- ✅ `docker/backend.Dockerfile` - Backend container image

### Documentation

#### New Files
- ✅ `QUICKSTART.md` - Quick start guide
- ✅ `TESTING.md` - Testing guide
- ✅ `MIGRATION_SUMMARY.md` - This file

## Environment Variables

### Frontend (.env)

**OLD:**
```bash
VITE_LOGAINM_API_KEY=xxx
VITE_GEOGRAPH_API_KEY=xxx
VITE_GRAPHHOPPER_API_KEY=xxx
```

**NEW:**
```bash
VITE_BACKEND_URL=http://localhost:3001
```

### Backend (.env)

**NEW:**
```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

LOGAINM_API_KEY=xxx
GEOGRAPH_API_KEY=xxx
GRAPHHOPPER_API_KEY=xxx
```

## API Endpoints

### Backend Serves
- `GET /health` - Health check
- `GET /debug/config` - Configuration debug info
- `GET /api/logainm/search?query=<name>` - Search Irish placenames
- `GET /api/geograph/search?lat=<lat>&lon=<lon>&radius=<m>` - Search photos
- `POST /api/graphhopper/route` - Get routing directions
- `GET /api/graphhopper/geocode?q=<query>` - Geocode addresses

### Frontend Configuration
```typescript
// frontend/src/config/api.ts
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  logainm: {
    search: `${BACKEND_URL}/api/logainm/search`,
  },
  geograph: {
    search: `${BACKEND_URL}/api/geograph/search`,
  },
  graphhopper: {
    route: `${BACKEND_URL}/api/graphhopper/route`,
    geocode: `${BACKEND_URL}/api/graphhopper/geocode`,
  },
  health: `${BACKEND_URL}/health`,
};
```

## Code Changes Summary

### Logainm (frontend/src/utils/logainm.ts)

**Before:**
```typescript
const LOGAINM_API_KEY = import.meta.env.VITE_LOGAINM_API_KEY || '';
const LOGAINM_API_URL = 'https://www.logainm.ie/api/v1.0/';

const response = await fetchFn(url.toString(), {
  headers: {
    'X-Api-Key': LOGAINM_API_KEY,
    ...
  }
});
```

**After:**
```typescript
import { API_ENDPOINTS } from '../config/api';

const url = new URL(API_ENDPOINTS.logainm.search);
url.searchParams.append('query', cleanName);

const response = await fetchFn(url.toString(), {
  headers: {
    'Accept': 'application/json',
  }
});
```

### Geograph (frontend/src/utils/geograph.ts)

**Before:**
```typescript
const GEOGRAPH_API_KEY = import.meta.env.VITE_GEOGRAPH_API_KEY || '';
url.searchParams.append('key', GEOGRAPH_API_KEY);
```

**After:**
```typescript
import { API_ENDPOINTS } from '../config/api';

const url = new URL(API_ENDPOINTS.geograph.search);
// No API key in frontend - backend handles it
```

### GraphHopper (frontend/src/utils/routing.ts)

**Before:**
```typescript
const apiKey = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
url.searchParams.append('key', apiKey);
```

**After:**
```typescript
import { API_ENDPOINTS } from '../config/api';

const response = await fetchFn(API_ENDPOINTS.graphhopper.route, {
  method: 'POST',
  body: JSON.stringify({ points, profile, locale })
});
// No API key in frontend - backend handles it
```

## Security Improvements

✅ **API keys no longer in frontend code**
- Before: API keys visible in browser, bundled JavaScript, network requests
- After: API keys only in backend .env file

✅ **Backend validates requests**
- Can add rate limiting, authentication, request validation
- Logs all API usage for monitoring

✅ **CORS protection**
- Backend only accepts requests from configured frontend URL
- Prevents unauthorized use of your API keys

✅ **Environment-specific configuration**
- Different API keys for dev/staging/production
- Easy to rotate keys without frontend changes

## Running the Application

### Local Development

**Terminal 1 - Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your API keys
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
# .env should have VITE_BACKEND_URL=http://localhost:3001
npm run dev
```

**Access:** http://localhost:5173

### Docker

```bash
cd docker
cp .env.example .env
# Edit .env and add your API keys
docker-compose up backend dev
```

**Access:** http://localhost:5173

## Testing

### Quick Test
```bash
# Test backend is running
curl http://localhost:3001/health

# Test API keys are loaded
curl http://localhost:3001/debug/config

# Test Logainm
curl "http://localhost:3001/api/logainm/search?query=Dublin"
```

### Browser Test
Open: http://localhost:5173/test-backend.html

### Full Test
See `TESTING.md` for comprehensive testing guide.

## Troubleshooting

### Backend won't start
```bash
cd backend
node test-env.js  # Check if .env is loaded
npm run dev       # Check startup banner for API key status
```

### Frontend can't reach backend
1. Check backend is running on port 3001
2. Check `frontend/.env` has `VITE_BACKEND_URL=http://localhost:5173`
3. Restart frontend dev server after changing .env

### 401 Errors from APIs
1. Check backend logs for `[Logainm Error]` messages
2. Verify API keys in `backend/.env` are correct
3. Test API key directly: See `backend/DEBUG.md`

### CORS Errors
1. Update `backend/.env`: `FRONTEND_URL=http://localhost:5173`
2. Restart backend

## Next Steps

1. ✅ Test the application locally
2. ✅ Verify all three APIs work (Logainm, Geograph, GraphHopper)
3. ⏭️ Deploy backend to a server (Railway, Render, Google Cloud Run, etc.)
4. ⏭️ Update frontend VITE_BACKEND_URL to production backend URL
5. ⏭️ Consider making external APIs optional for Tauri builds
6. ⏭️ Add caching to backend to reduce API calls
7. ⏭️ Add rate limiting to backend endpoints
8. ⏭️ Set up backend monitoring/logging

## Benefits Achieved

✅ **Privacy** - API keys not exposed to users
✅ **Security** - Can rotate keys without frontend changes
✅ **Control** - Monitor and limit API usage
✅ **Flexibility** - Easy to add more APIs or change providers
✅ **Scalability** - Can add caching, rate limiting, etc.
✅ **Debugging** - Centralized logging of all API calls

## Files You Can Safely Delete

These old API key environment variables are no longer needed in frontend:
- ❌ `VITE_LOGAINM_API_KEY` (moved to backend)
- ❌ `VITE_GEOGRAPH_API_KEY` (moved to backend)
- ❌ `VITE_GRAPHHOPPER_API_KEY` (moved to backend)

## Git Considerations

Make sure these are in `.gitignore`:
- ✅ `backend/.env` (contains API keys - NEVER commit)
- ✅ `frontend/.env` (may contain production backend URL)
- ⚠️ `backend/.env.example` (safe to commit - no real keys)
- ⚠️ `frontend/.env.example` (safe to commit - just URLs)
