# Testing the Backend API Integration

This guide will help you test that the frontend is correctly calling the backend API.

## Prerequisites

Make sure you have:
1. ✅ Backend running on port 3001 (`cd backend && npm run dev`)
2. ✅ API keys configured in `backend/.env`
3. ✅ Frontend configured with `VITE_BACKEND_URL=http://localhost:3001` in `frontend/.env`

## Quick Test Methods

### Method 1: Browser-Based Test Page

Open the test page in your browser:

```bash
cd frontend
npm run dev
```

Then open: `http://localhost:5173/test-backend.html`

This page will automatically test:
- ✅ Backend health check
- ✅ Configuration (API keys loaded)
- ✅ Logainm search
- ✅ Geograph photo search
- ✅ GraphHopper routing

Click each button to test the APIs. Results will show with ✅ or ❌.

### Method 2: Command Line Tests

With both backend and frontend running, test each endpoint:

#### 1. Health Check
```bash
curl http://localhost:3001/health
```

**Expected:** `{"status":"ok","timestamp":"...","uptime":...}`

#### 2. Config Check
```bash
curl http://localhost:3001/debug/config | jq
```

**Expected:** Should show all three API keys as configured (✅)

#### 3. Logainm Search
```bash
curl "http://localhost:3001/api/logainm/search?query=Dublin" | jq
```

**Expected:** JSON with `totalCount` and `results` array

#### 4. Geograph Search
```bash
curl "http://localhost:3001/api/geograph/search?lat=53.3498&lon=-6.2603&radius=5000" | jq
```

**Expected:** JSON with `items` array of photos

#### 5. GraphHopper Routing
```bash
curl -X POST http://localhost:3001/api/graphhopper/route \
  -H "Content-Type: application/json" \
  -d '{
    "points": [[-6.2603, 53.3498], [-8.4756, 51.8985]],
    "profile": "car",
    "locale": "en"
  }' | jq
```

**Expected:** JSON with `paths` array containing route data

### Method 3: Test in the Main App

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open the app in browser
4. Click on a location on the map
5. Check browser DevTools Console for:
   - ✅ No 401 errors
   - ✅ API calls going to `http://localhost:3001/api/...`
   - ✅ Successful responses

## Verifying the Integration

### Check Browser Network Tab

1. Open DevTools → Network tab
2. Click on a location in the map
3. Look for requests to:
   - `http://localhost:3001/api/logainm/search?query=...`
   - `http://localhost:3001/api/geograph/search?lat=...&lon=...`
   - `http://localhost:3001/api/graphhopper/route`

### Check Backend Logs

Watch the backend terminal for debug logs:

```
[Logainm Debug] API Key present: true
[Logainm Debug] API Key (masked): P47R...FGT
[Logainm Debug] Query: Dublin
[Logainm Debug] Response status: 200
```

## Troubleshooting

### Frontend can't reach backend

**Error in browser console:** `Failed to fetch` or `ERR_CONNECTION_REFUSED`

**Solutions:**
1. Make sure backend is running: `cd backend && npm run dev`
2. Check backend URL in frontend/.env: `VITE_BACKEND_URL=http://localhost:3001`
3. Restart frontend dev server after changing .env

### CORS errors

**Error:** `Access-Control-Allow-Origin` error

**Solutions:**
1. Check `FRONTEND_URL` in `backend/.env` matches your frontend URL
2. Default is `http://localhost:3000` but Vite uses `http://localhost:5173`
3. Update backend/.env: `FRONTEND_URL=http://localhost:5173`
4. Restart backend

### API still getting 401 errors

**Solutions:**
1. Run: `cd backend && node test-env.js`
2. Check that API keys are loaded correctly
3. Look at backend terminal for `[Logainm Error]` logs
4. Verify API key is valid on the provider's website

### Environment variables not loading

**Frontend:**
- Must restart Vite dev server after changing .env
- Variable must start with `VITE_`
- Access with `import.meta.env.VITE_BACKEND_URL`

**Backend:**
- Must restart Node server after changing .env
- No prefix needed
- Access with `process.env.LOGAINM_API_KEY`

## Success Criteria

You'll know everything is working when:

✅ Backend starts and shows all API keys as configured
✅ Frontend can reach backend health endpoint
✅ Clicking on map locations shows Irish placename data
✅ Geograph photos appear for locations
✅ Routing works between two points
✅ No 401 or CORS errors in browser console
✅ All API calls go through `http://localhost:3001/api/...`

## Next Steps

Once local testing works:

1. **Docker Testing:** Use `docker-compose up backend dev` to test containerized setup
2. **Tauri Testing:** Build Tauri app and test that it can reach the backend
3. **Production:** Deploy backend with proper environment variables
4. **Optional Services:** Make Logainm/Geograph/GraphHopper optional for offline Tauri builds

## Clean Up Old Configuration

You can now safely remove the old VITE_*_API_KEY variables:
- ❌ No longer needed in `frontend/.env`
- ✅ All API keys now in `backend/.env`

The frontend only needs `VITE_BACKEND_URL`.
