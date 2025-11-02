import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';

const router = Router();

/**
 * Proxy endpoint for Nominatim API (geocoding search)
 * GET /api/nominatim/search?q=<query>&format=<format>&...
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, format, addressdetails, viewbox, bounded, limit, polygon_geojson } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    console.log('[Nominatim Debug] Query:', q);
    console.log('[Nominatim Debug] Format:', format);

    const url = 'https://nominatim.openstreetmap.org/search';
    const params: any = {
      q,
      format: format || 'json',
    };

    // Add optional parameters if provided
    if (addressdetails) params.addressdetails = addressdetails;
    if (viewbox) params.viewbox = viewbox;
    if (bounded) params.bounded = bounded;
    if (limit) params.limit = limit;
    if (polygon_geojson) params.polygon_geojson = polygon_geojson;

    console.log('[Nominatim Debug] URL:', url);
    console.log('[Nominatim Debug] Params:', params);

    const response = await axios.get(url, {
      params,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Learscail/1.0',
      },
      timeout: 10000,
    });

    console.log('[Nominatim Debug] Response status:', response.status);
    console.log('[Nominatim Debug] Response data length:', Array.isArray(response.data) ? response.data.length : 'not array');

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.message || error.response?.data || 'Nominatim API error';

      console.error('[Nominatim Error] Status:', statusCode);
      console.error('[Nominatim Error] Message:', message);

      return res.status(statusCode).json({
        error: message,
        statusCode,
      });
    }
    next(error);
  }
});

export default router;
