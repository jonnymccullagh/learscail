// API Configuration

// Backend API URL - defaults to localhost for development
// Can be overridden with VITE_BACKEND_URL environment variable
// Empty string means use relative URLs (for nginx reverse proxy)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL !== undefined
  ? import.meta.env.VITE_BACKEND_URL
  : 'http://localhost:3001';

// Check if we're in a Tauri context
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// API endpoints
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
  nominatim: {
    search: `${BACKEND_URL}/api/nominatim/search`,
  },
  sraid: {
    irish: `${BACKEND_URL}/api/sraid/pronunciation/irish`,
    english: `${BACKEND_URL}/api/sraid/pronunciation/english`,
  },
  health: `${BACKEND_URL}/health`,
};
