import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';

const router = Router();

/**
 * Proxy endpoint for Logainm API
 * GET /api/logainm/search?query=<placename>
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Debug logging
    const apiKey = config.apiKeys.logainm;
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT_SET';
    console.log('[Logainm Debug] API Key present:', !!apiKey);
    console.log('[Logainm Debug] API Key (masked):', maskedKey);
    console.log('[Logainm Debug] Query:', query);
    console.log('[Logainm Debug] Limit:', limit);

    if (!apiKey) {
      return res.status(500).json({
        error: 'Logainm API key not configured in backend',
        debug: 'Check LOGAINM_API_KEY in .env file'
      });
    }

    // Logainm API uses X-Api-Key header
    const headers = {
      'Accept': 'application/json',
      'X-Api-Key': apiKey,
      'User-Agent': 'Learscail/1.0',
    };

    console.log('[Logainm Debug] Headers:', {
      ...headers,
      'X-Api-Key': maskedKey,
    });

    const url = 'https://www.logainm.ie/api/v1.0/';
    const params = {
      Query: query,  // Logainm uses capital Q
      str: 'on',
      cat: 'SR',
    };

    console.log('[Logainm Debug] URL:', url);
    console.log('[Logainm Debug] Params:', params);

    const response = await axios.get(url, {
      params,
      headers,
      timeout: 10000,
    });

    console.log('[Logainm Debug] Response status:', response.status);
    console.log('[Logainm Debug] Response data keys:', Object.keys(response.data));

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.message || error.response?.data || 'Logainm API error';

      console.error('[Logainm Error] Status:', statusCode);
      console.error('[Logainm Error] Message:', message);
      console.error('[Logainm Error] Response data:', error.response?.data);

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
