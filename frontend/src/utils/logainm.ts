// Logainm API integration
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { API_ENDPOINTS, isTauri } from '../config/api';

// Use Tauri fetch if available, otherwise fall back to browser fetch
const fetchFn = isTauri ? tauriFetch : fetch;

// Street types to remove when cleaning names
const STREET_TYPES = [
  'Avenue', 'Close', 'Court', 'Crescent', 'Drive', 'East', 'Gardens',
  'Grange', 'Grove', 'Hall', 'Heights', 'Lane', 'Lower', 'Manor',
  'Mews', 'North', 'Parade', 'Place', 'Park', 'Road', 'South',
  'Street', 'Square', 'Terrace', 'Upper', 'View', 'Way', 'Walk',
  'West', 'Yard'
];

// Clean location name by removing street types
export function cleanLocationName(name: string): string {
  let cleaned = name;
  STREET_TYPES.forEach(type => {
    const regex = new RegExp(`\\b${type}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  return cleaned.trim();
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Query Logainm API with retry logic for similar names
export async function queryLogainm(
  locationName: string,
  clickedLat?: number,
  clickedLon?: number
): Promise<any> {
  try {
    const cleanName = cleanLocationName(locationName);

    // Support both absolute and relative URLs
    const baseUrl = API_ENDPOINTS.logainm.search.startsWith('http')
      ? API_ENDPOINTS.logainm.search
      : window.location.origin + API_ENDPOINTS.logainm.search;
    const url = new URL(baseUrl);
    url.searchParams.append('query', cleanName);
    url.searchParams.append('limit', '10');

    const response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Logainm API error: ${response.status}`);
    }

    const data = await response.json();

    // If no exact match but similarNames exist, try first similar name
    if (data.totalCount === 0 && data.similarNames && data.similarNames.length > 0) {
      const similarBaseUrl = API_ENDPOINTS.logainm.search.startsWith('http')
        ? API_ENDPOINTS.logainm.search
        : window.location.origin + API_ENDPOINTS.logainm.search;
      const similarUrl = new URL(similarBaseUrl);
      similarUrl.searchParams.append('query', data.similarNames[0]);
      similarUrl.searchParams.append('limit', '10');

      const similarResponse = await fetchFn(similarUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (similarResponse.ok) {
        const similarData = await similarResponse.json();
        if (similarData.totalCount > 0) {
          return findClosestResult(similarData, clickedLat, clickedLon);
        }
      }
    }

    return findClosestResult(data, clickedLat, clickedLon);
  } catch (error) {
    console.error('Error querying Logainm:', error);
    return null;
  }
}

// Find the closest result based on coordinates
function findClosestResult(data: any, clickedLat?: number, clickedLon?: number): any {
  if (!data.results || data.results.length === 0) {
    return null;
  }

  // If no coordinates provided or only one result, return first result
  if (!clickedLat || !clickedLon || data.results.length === 1) {
    return data.results[0];
  }

  // Find result with closest coordinates
  let closestResult = data.results[0];
  let minDistance = Infinity;

  data.results.forEach((result: any) => {
    if (result.geography?.coordinates && result.geography.coordinates.length > 0) {
      const coord = result.geography.coordinates[0];
      const distance = calculateDistance(
        clickedLat,
        clickedLon,
        coord.latitude,
        coord.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestResult = result;
      }
    }
  });

  return closestResult;
}

// Extract useful information from Logainm result
export interface LogainmInfo {
  gaName?: string;
  enName?: string;
  gaAudio?: string;
  enAudio?: string;
  glossary: Array<{ headword: string; translation: string }>;
  category?: string;
  county?: string;
}

export function formatLogainmResult(result: any): LogainmInfo | null {
  if (!result) return null;

  const info: LogainmInfo = {
    glossary: []
  };

  // Extract placenames
  if (result.placenames) {
    const gaPlace = result.placenames.find((p: any) => p.language === 'ga' && p.main);
    const enPlace = result.placenames.find((p: any) => p.language === 'en' && p.main);

    if (gaPlace) {
      info.gaName = gaPlace.wording;
      if (gaPlace.audio?.uri) {
        info.gaAudio = gaPlace.audio.uri;
      }
    }

    if (enPlace) {
      info.enName = enPlace.wording;
      if (enPlace.audio?.uri) {
        info.enAudio = enPlace.audio.uri;
      }
    }
  }

  // Extract glossary
  if (result.glossary && Array.isArray(result.glossary)) {
    info.glossary = result.glossary.map((g: any) => ({
      headword: g.headword,
      translation: g.translation
    }));
  }

  // Extract category
  if (result.categories && result.categories.length > 0) {
    info.category = result.categories[0].nameEN;
  }

  // Extract county
  if (result.includedIn) {
    const county = result.includedIn.find((i: any) => i.category?.id === 'CON');
    if (county) {
      info.county = county.nameEN;
    }
  }

  return info;
}
