// Sraid API integration for pronunciation audio
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { API_ENDPOINTS, isTauri } from '../config/api';

// Use Tauri fetch if available, otherwise fall back to browser fetch
const fetchFn = isTauri ? tauriFetch : fetch;

export interface SraidLocation {
  id: string;
  name_en: string;
  name_ga: string;
  lat: number;
  lng: number;
  language: number;
  path: string;
}

export interface SraidResponse {
  count: number;
  locations: SraidLocation[];
}

export interface SraidAudioResult {
  irish: SraidResponse | null;
  english: SraidResponse | null;
}

/**
 * Query Sraid API for pronunciation audio files
 * @param searchTerm The place name to search for
 * @returns Object containing Irish and English pronunciation results
 */
export async function querySraid(searchTerm: string): Promise<SraidAudioResult> {
  const result: SraidAudioResult = {
    irish: null,
    english: null
  };

  try {
    // Query both Irish and English pronunciations in parallel
    const [irishResponse, englishResponse] = await Promise.all([
      querySraidLanguage(searchTerm, 'irish'),
      querySraidLanguage(searchTerm, 'english')
    ]);

    result.irish = irishResponse;
    result.english = englishResponse;
  } catch (error) {
    console.error('Error querying Sraid API:', error);
  }

  return result;
}

/**
 * Query Sraid API for a specific language
 * @param searchTerm The place name to search for
 * @param language Either 'irish' or 'english'
 * @returns Sraid API response or null if error
 */
async function querySraidLanguage(
  searchTerm: string,
  language: 'irish' | 'english'
): Promise<SraidResponse | null> {
  try {
    // Support both absolute and relative URLs
    const baseUrl = API_ENDPOINTS.sraid[language].startsWith('http')
      ? API_ENDPOINTS.sraid[language]
      : window.location.origin + API_ENDPOINTS.sraid[language];
    
    const url = new URL(baseUrl);
    url.searchParams.append('searchterm', searchTerm);

    const response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Sraid API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (typeof data.count === 'number' && Array.isArray(data.locations)) {
      return data as SraidResponse;
    }

    return null;
  } catch (error) {
    console.error(`Error querying Sraid API (${language}):`, error);
    return null;
  }
}
