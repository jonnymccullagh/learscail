import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiKeys: {
    logainm: process.env.LOGAINM_API_KEY || '',
    geograph: process.env.GEOGRAPH_API_KEY || '',
    graphhopper: process.env.GRAPHHOPPER_API_KEY || '',
  },
};

// Validate required API keys
const validateConfig = () => {
  const missing: string[] = [];

  if (!config.apiKeys.logainm) missing.push('LOGAINM_API_KEY');
  if (!config.apiKeys.geograph) missing.push('GEOGRAPH_API_KEY');
  if (!config.apiKeys.graphhopper) missing.push('GRAPHHOPPER_API_KEY');

  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (missing.length > 0) {
    console.warn(`Warning: Missing API keys: ${missing.join(', ')}`);
  }
};

validateConfig();
