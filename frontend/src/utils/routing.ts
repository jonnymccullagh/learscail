import { API_ENDPOINTS, isTauri } from '../config/api';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Use Tauri fetch if available, otherwise fall back to browser fetch
const fetchFn = isTauri ? tauriFetch : fetch;

export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteInstruction {
  distance: number
  time: number
  text: string
  street_name?: string
  sign: number // Turn instruction type
}

export interface RoutePath {
  distance: number // in meters
  time: number // in milliseconds
  points: {
    coordinates: [number, number][] // [lng, lat]
  }
  instructions: RouteInstruction[]
}

export interface RouteResponse {
  paths: RoutePath[]
}

export interface RouteError {
  type: 'rate_limit' | 'api_error' | 'network_error' | 'no_route'
  message: string
}

export interface RouteResult {
  data?: RouteResponse
  error?: RouteError
}

/**
 * Query GraphHopper API for route between two points
 * Uses the backend API proxy
 */
export async function queryRoute(
  start: RoutePoint,
  end: RoutePoint,
  profile: 'car' | 'foot' | 'bike' = 'car'
): Promise<RouteResult> {
  try {
    const response = await fetchFn(API_ENDPOINTS.graphhopper.route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        points: [[start.lng, start.lat], [end.lng, end.lat]],
        profile,
        locale: 'en',
      }),
    })

    if (!response.ok) {
      // Check for rate limiting
      if (response.status === 429) {
        return {
          error: {
            type: 'rate_limit',
            message: 'Rate limit exceeded'
          }
        }
      }

      // Other API errors
      console.error('GraphHopper API error:', response.statusText)
      return {
        error: {
          type: 'api_error',
          message: response.statusText
        }
      }
    }

    const data = await response.json()

    // Check if the response contains an error message from GraphHopper
    if (data.message) {
      return {
        error: {
          type: 'api_error',
          message: data.message
        }
      }
    }

    return { data }
  } catch (error) {
    console.error('Error fetching route:', error)
    return {
      error: {
        type: 'network_error',
        message: 'Network error'
      }
    }
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  const minutes = Math.round(milliseconds / 60000)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}min`
}

/**
 * Get turn instruction text based on sign code
 */
export function getTurnInstruction(sign: number): string {
  const instructions: { [key: number]: string } = {
    '-7': 'Make a U-turn',
    '-3': 'Turn sharp left',
    '-2': 'Turn left',
    '-1': 'Turn slight left',
    0: 'Continue straight',
    1: 'Turn slight right',
    2: 'Turn right',
    3: 'Turn sharp right',
    4: 'Finish',
    5: 'Via reached',
    6: 'Use roundabout',
  }
  return instructions[sign] || 'Continue'
}
