import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import logainmRouter from './routes/logainm';
import geographRouter from './routes/geograph';
import graphhopperRouter from './routes/graphhopper';
import nominatimRouter from './routes/nominatim';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Debug endpoint to check API key configuration
app.get('/debug/config', (req: Request, res: Response) => {
  const maskKey = (key: string) => {
    if (!key) return 'NOT_SET';
    if (key.length < 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  res.json({
    environment: config.nodeEnv,
    port: config.port,
    frontendUrl: config.frontendUrl,
    apiKeys: {
      logainm: {
        configured: !!config.apiKeys.logainm,
        masked: maskKey(config.apiKeys.logainm),
        length: config.apiKeys.logainm?.length || 0,
      },
      geograph: {
        configured: !!config.apiKeys.geograph,
        masked: maskKey(config.apiKeys.geograph),
        length: config.apiKeys.geograph?.length || 0,
      },
      graphhopper: {
        configured: !!config.apiKeys.graphhopper,
        masked: maskKey(config.apiKeys.graphhopper),
        length: config.apiKeys.graphhopper?.length || 0,
      },
    },
  });
});

// API routes
app.use('/api/logainm', logainmRouter);
app.use('/api/geograph', geographRouter);
app.use('/api/graphhopper', graphhopperRouter);
app.use('/api/nominatim', nominatimRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      statusCode: 404,
      path: req.path,
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  const maskKey = (key: string) => {
    if (!key) return '❌ NOT_SET';
    return `✅ ${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  console.log(`
🚀 Learscail Backend API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${config.nodeEnv}
Port: ${config.port}
Frontend URL: ${config.frontendUrl}

API Keys:
  Logainm:     ${maskKey(config.apiKeys.logainm)}
  Geograph:    ${maskKey(config.apiKeys.geograph)}
  GraphHopper: ${maskKey(config.apiKeys.graphhopper)}

Endpoints:
  - GET  /health
  - GET  /debug/config
  - GET  /api/logainm/search
  - GET  /api/geograph/search
  - POST /api/graphhopper/route
  - GET  /api/graphhopper/geocode
  - GET  /api/nominatim/search

Debug: curl http://localhost:${config.port}/debug/config
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
