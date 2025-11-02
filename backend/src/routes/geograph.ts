import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';

const router = Router();

/**
 * Proxy endpoint for Geograph API
 * GET /api/geograph/search?lat=<lat>&lon=<lon>&radius=<radius>
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lon, radius = 1000, limit = 10 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon parameters are required' });
    }

    // Debug logging
    const apiKey = config.apiKeys.geograph;
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT_SET';
    console.log('[Geograph Debug] API Key present:', !!apiKey);
    console.log('[Geograph Debug] API Key (masked):', maskedKey);
    console.log('[Geograph Debug] Lat:', lat, 'Lon:', lon, 'Radius:', radius);

    if (!apiKey) {
      return res.status(500).json({
        error: 'Geograph API key not configured in backend',
        debug: 'Check GEOGRAPH_API_KEY in .env file'
      });
    }

    // Geograph API uses 'key' parameter in query string, not header
    // The API endpoint expects: q=lat,lon format
    const params = {
      format: 'JSON',
      q: `${lat},${lon}`,
      distance: Math.round(Number(radius) / 1000), // Convert meters to km
      key: apiKey,
    };

    console.log('[Geograph Debug] URL:', 'https://www.geograph.org.uk/syndicator.php');
    console.log('[Geograph Debug] Params:', {
      ...params,
      key: maskedKey,
    });

    const response = await axios.get('https://www.geograph.org.uk/syndicator.php', {
      params,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Learscail/1.0',
      },
      timeout: 10000,
    });

    console.log('[Geograph Debug] Response status:', response.status);
    console.log('[Geograph Debug] Items found:', response.data?.items?.length || 0);

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.message || error.response?.data || 'Geograph API error';

      console.error('[Geograph Error] Status:', statusCode);
      console.error('[Geograph Error] Message:', message);
      console.error('[Geograph Error] Response data:', error.response?.data);

      return res.status(statusCode).json({
        error: message,
        statusCode,
        debug: {
          url: error.config?.url,
          params: error.config?.params,
        }
      });
    }
    next(error);
  }
});

export default router;
