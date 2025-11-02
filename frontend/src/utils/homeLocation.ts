export interface HomeLocation {
  name?: string
  nameGa?: string
  nameEn?: string
  coordinates: { lat: number; lng: number }
}

const HOME_LOCATION_KEY = 'mappa_home_location'

export function getHomeLocation(): HomeLocation | null {
  try {
    const stored = localStorage.getItem(HOME_LOCATION_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading home location:', error)
    return null
  }
}

export function saveHomeLocation(location: HomeLocation): void {
  try {
    localStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(location))
  } catch (error) {
    console.error('Error saving home location:', error)
  }
}

export function clearHomeLocation(): void {
  try {
    localStorage.removeItem(HOME_LOCATION_KEY)
  } catch (error) {
    console.error('Error clearing home location:', error)
  }
}
