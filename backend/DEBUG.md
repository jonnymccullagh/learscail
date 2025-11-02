# Backend Debugging Guide

## Checking API Key Configuration

### 1. Verify Environment Variables

First, ensure your `.env` file exists and has the API keys:

```bash
cd backend
cat .env
```

You should see:
```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

LOGAINM_API_KEY=your_actual_key_here
GEOGRAPH_API_KEY=your_actual_key_here
GRAPHHOPPER_API_KEY=your_actual_key_here
```

### 2. Check Configuration Endpoint

Start the backend server:
```bash
npm run dev
```

Then check the configuration endpoint:
```bash
curl http://localhost:3001/debug/config | jq
```

This will show you:
- Whether each API key is configured
- The masked value (first 4 and last 4 characters)
- The length of each API key

Example output:
```json
{
  "environment": "development",
  "port": 3001,
  "frontendUrl": "http://localhost:3000",
  "apiKeys": {
    "logainm": {
      "configured": true,
      "masked": "abcd...xyz9",
      "length": 32
    },
    "geograph": {
      "configured": true,
      "masked": "1234...5678",
      "length": 40
    },
    "graphhopper": {
      "configured": true,
      "masked": "ghk_...abc",
      "length": 39
    }
  }
}
```

### 3. Test Logainm API Call

Test the Logainm endpoint directly:
```bash
curl "http://localhost:3001/api/logainm/search?query=Dublin" | jq
```

Watch the terminal running the backend server for debug logs:
```
[Logainm Debug] API Key present: true
[Logainm Debug] API Key (masked): abcd...xyz9
[Logainm Debug] Query: Dublin
[Logainm Debug] Limit: 10
[Logainm Debug] Headers: {
  Accept: 'application/json',
  'X-Api-Key': 'abcd...xyz9',
  'User-Agent': 'Learscail/1.0'
}
[Logainm Debug] URL: https://www.logainm.ie/api/v1.0/
[Logainm Debug] Params: { Query: 'Dublin', str: 'on', cat: 'SR' }
```

### 4. Common Issues

#### Issue: API Key Not Set

**Error:** `"error": "Logainm API key not configured in backend"`

**Solution:**
1. Check your `.env` file exists in the `backend/` directory
2. Ensure `LOGAINM_API_KEY=` has a value
3. Restart the backend server after changing `.env`

#### Issue: 401 Unauthorized

**Error:** `[Logainm Error] Status: 401`

**Possible causes:**
1. **Invalid API key** - Check you copied the correct key from Logainm
2. **Incorrect header format** - Logainm uses `X-Api-Key` header (now fixed in code)
3. **API key expired** - Check if your Logainm account is still active

**To verify your API key directly:**
```bash
# Test your API key directly against Logainm API
curl -H "X-Api-Key: YOUR_ACTUAL_KEY" \
  "https://www.logainm.ie/api/v1.0/?Query=Dublin&str=on&cat=SR"
```

If this works but the backend doesn't, check:
- The API key in `.env` matches the one you tested
- No extra spaces or quotes in the `.env` file
- You restarted the backend after changing `.env`

#### Issue: API Key Has Extra Characters

Check for:
- Quotes around the value: ❌ `LOGAINM_API_KEY="abc123"` → ✅ `LOGAINM_API_KEY=abc123`
- Spaces: ❌ `LOGAINM_API_KEY= abc123 ` → ✅ `LOGAINM_API_KEY=abc123`
- Line breaks in the middle of the key

### 5. Verify .env is Loaded

Add this temporary debug log to `backend/src/config/index.ts` after the imports:

```typescript
console.log('Environment loaded:', {
  hasLogainm: !!process.env.LOGAINM_API_KEY,
  logainmLength: process.env.LOGAINM_API_KEY?.length,
});
```

Restart the server and check if this prints on startup.

## Logainm API Documentation

The Logainm API expects:
- **Base URL:** `https://www.logainm.ie/api/v1.0/`
- **Header:** `X-Api-Key: YOUR_KEY`
- **Parameters:**
  - `Query` - search term (capital Q)
  - `str` - string matching mode ('on')
  - `cat` - category filter ('SR' for street)

## Need More Help?

Enable verbose axios logging by adding this to `backend/src/routes/logainm.ts`:

```typescript
axios.interceptors.request.use(request => {
  console.log('[Axios] Starting Request:', JSON.stringify(request, null, 2));
  return request;
});
```
