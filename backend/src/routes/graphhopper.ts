import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';

const router = Router();

/**
 * Proxy endpoint for GraphHopper routing API
 * POST /api/graphhopper/route
 * Body: { points: [[lon1, lat1], [lon2, lat2]], profile: 'car' | 'bike' | 'foot' }
 */
router.post('/route', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { points, profile = 'car', locale = 'en' } = req.body;

    if (!points || !Array.isArray(points) || points.length < 2) {
      return res.status(400).json({
        error: 'points array with at least 2 coordinates is required'
      });
    }

    const response = await axios.post(
      'https://graphhopper.com/api/1/route',
      {
        points,
        profile,
        locale,
        instructions: true,
        calc_points: true,
        points_encoded: false,
      },
      {
        params: {
          key: config.apiKeys.graphhopper,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.message || 'GraphHopper API error';
      return res.status(statusCode).json({ error: message });
    }
    next(error);
  }
});

/**
 * Proxy endpoint for GraphHopper geocoding API
 * GET /api/graphhopper/geocode?q=<query>
 */
router.get('/geocode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = 10, locale = 'en' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'q (query) parameter is required' });
    }

    const response = await axios.get('https://graphhopper.com/api/1/geocode', {
      params: {
        q,
        limit,
        locale,
        key: config.apiKeys.graphhopper,
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.message || 'GraphHopper API error';
      return res.status(statusCode).json({ error: message });
    }
    next(error);
  }
});

export default router;
