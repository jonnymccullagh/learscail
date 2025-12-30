import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';

const router = Router();

/**
 * Proxy endpoint for Sraid API - Irish pronunciation
 * GET /api/sraid/pronunciation/irish?searchterm=<placename>
 */
router.get('/pronunciation/irish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { searchterm } = req.query;

    if (!searchterm || typeof searchterm !== 'string') {
      return res.status(400).json({ error: 'searchterm parameter is required' });
    }

    console.log('[Sraid Debug] Querying Irish pronunciation for:', searchterm);

    const url = 'https://sraid.redbranch.net/api/v1/pronunciation/irish';
    const response = await axios.get(url, {
      params: { searchterm },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Learscail/1.0',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('[Sraid Debug] Irish pronunciation response:', {
      status: response.status,
      count: response.data?.count,
    });

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Sraid Error] Irish pronunciation API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Sraid API error',
          details: error.response.data,
        });
      }
    }

    console.error('[Sraid Error] Unexpected error:', error);
    next(error);
  }
});

/**
 * Proxy endpoint for Sraid API - English pronunciation
 * GET /api/sraid/pronunciation/english?searchterm=<placename>
 */
router.get('/pronunciation/english', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { searchterm } = req.query;

    if (!searchterm || typeof searchterm !== 'string') {
      return res.status(400).json({ error: 'searchterm parameter is required' });
    }

    console.log('[Sraid Debug] Querying English pronunciation for:', searchterm);

    const url = 'https://sraid.redbranch.net/api/v1/pronunciation/english';
    const response = await axios.get(url, {
      params: { searchterm },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Learscail/1.0',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('[Sraid Debug] English pronunciation response:', {
      status: response.status,
      count: response.data?.count,
    });

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Sraid Error] English pronunciation API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Sraid API error',
          details: error.response.data,
        });
      }
    }

    console.error('[Sraid Error] Unexpected error:', error);
    next(error);
  }
});

export default router;
