// Geograph API integration
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { API_ENDPOINTS, isTauri } from '../config/api';

// Use Tauri fetch if available, otherwise fall back to browser fetch
const fetchFn = isTauri ? tauriFetch : fetch;

export interface GeographImage {
  title: string;
  description: string;
  link: string;
  author: string;
  thumb: string;
  lat: string;
  long: string;
  licence: string;
  imageTaken: string;
  guid: string;
}

export interface GeographResponse {
  items: GeographImage[];
  total?: number;
}

export async function queryGeograph(
  lat: number,
  lng: number,
  distance: number = 1
): Promise<GeographResponse | null> {
  try {
    // Support both absolute and relative URLs
    const baseUrl = API_ENDPOINTS.geograph.search.startsWith('http')
      ? API_ENDPOINTS.geograph.search
      : window.location.origin + API_ENDPOINTS.geograph.search;
    const url = new URL(baseUrl);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lng.toString());
    url.searchParams.append('radius', (distance * 1000).toString()); // Convert km to meters
    url.searchParams.append('limit', '10');

    const response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Geograph API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return {
      items: data.items,
      total: data.items.length
    };
  } catch (error) {
    console.error('Error querying Geograph:', error);
    return null;
  }
}
