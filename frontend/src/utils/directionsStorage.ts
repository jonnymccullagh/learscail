import type { RoutePoint, RouteResponse } from './routing'

export interface DirectionsData {
  startPoint: RoutePoint | null
  endPoint: RoutePoint | null
  startName: string
  endName: string
  route: RouteResponse | null
  profile: 'car' | 'foot' | 'bike'
}

const DIRECTIONS_KEY = 'mappa_directions_data'

export function getDirectionsData(): DirectionsData | null {
  try {
    const stored = localStorage.getItem(DIRECTIONS_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading directions data:', error)
    return null
  }
}

export function saveDirectionsData(data: DirectionsData): void {
  try {
    localStorage.setItem(DIRECTIONS_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving directions data:', error)
  }
}

export function clearDirectionsData(): void {
  try {
    localStorage.removeItem(DIRECTIONS_KEY)
  } catch (error) {
    console.error('Error clearing directions data:', error)
  }
}
