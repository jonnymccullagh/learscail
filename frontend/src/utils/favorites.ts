export interface Favorite {
  id: string
  name: string
  coordinates: {
    lat: number
    lng: number
  }
  timestamp: number
  notes?: string
}

export interface FavoritesGeoJSON {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Point'
      coordinates: [number, number] // [lng, lat]
    }
    properties: {
      id: string
      name: string
      timestamp: number
      notes?: string
    }
  }>
}

const FAVORITES_KEY = 'mappa_favorites'
const SHOW_FAVORITES_KEY = 'mappa_show_favorites'

export function getFavorites(): Favorite[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    if (!stored) return []
    const geojson: FavoritesGeoJSON = JSON.parse(stored)

    // Convert GeoJSON to Favorite array
    return geojson.features.map(feature => ({
      id: feature.properties.id,
      name: feature.properties.name,
      coordinates: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
      },
      timestamp: feature.properties.timestamp,
      notes: feature.properties.notes
    }))
  } catch (error) {
    console.error('Error reading favorites:', error)
    return []
  }
}

export function saveFavorites(favorites: Favorite[]): void {
  try {
    // Convert Favorite array to GeoJSON
    const geojson: FavoritesGeoJSON = {
      type: 'FeatureCollection',
      features: favorites.map(fav => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [fav.coordinates.lng, fav.coordinates.lat]
        },
        properties: {
          id: fav.id,
          name: fav.name,
          timestamp: fav.timestamp,
          notes: fav.notes
        }
      }))
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(geojson))
  } catch (error) {
    console.error('Error saving favorites:', error)
  }
}

export function addFavorite(favorite: Omit<Favorite, 'id' | 'timestamp'>): Favorite {
  const favorites = getFavorites()
  const newFavorite: Favorite = {
    ...favorite,
    id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  }
  favorites.unshift(newFavorite)
  saveFavorites(favorites)
  return newFavorite
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites()
  const filtered = favorites.filter(fav => fav.id !== id)
  saveFavorites(filtered)
}

export function updateFavorite(id: string, updates: Partial<Pick<Favorite, 'name' | 'notes'>>): void {
  const favorites = getFavorites()
  const index = favorites.findIndex(fav => fav.id === id)
  if (index !== -1) {
    favorites[index] = { ...favorites[index], ...updates }
    saveFavorites(favorites)
  }
}

export function exportFavoritesToGeoJSON(): string {
  const favorites = getFavorites()
  const geojson: FavoritesGeoJSON = {
    type: 'FeatureCollection',
    features: favorites.map(fav => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [fav.coordinates.lng, fav.coordinates.lat]
      },
      properties: {
        id: fav.id,
        name: fav.name,
        timestamp: fav.timestamp,
        notes: fav.notes
      }
    }))
  }
  return JSON.stringify(geojson, null, 2)
}

export function importFavoritesFromGeoJSON(geojsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const geojson: FavoritesGeoJSON = JSON.parse(geojsonString)

    // Validate GeoJSON structure
    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      return { success: false, count: 0, error: 'Invalid GeoJSON format' }
    }

    // Convert GeoJSON to favorites
    const importedFavorites: Favorite[] = geojson.features
      .filter(feature =>
        feature.type === 'Feature' &&
        feature.geometry?.type === 'Point' &&
        Array.isArray(feature.geometry.coordinates) &&
        feature.geometry.coordinates.length === 2 &&
        feature.properties?.name
      )
      .map(feature => ({
        id: feature.properties.id || `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: feature.properties.name,
        coordinates: {
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        },
        timestamp: feature.properties.timestamp || Date.now(),
        notes: feature.properties.notes
      }))

    if (importedFavorites.length === 0) {
      return { success: false, count: 0, error: 'No valid favorites found in file' }
    }

    // Get existing favorites and merge (avoid duplicates by ID)
    const existingFavorites = getFavorites()
    const existingIds = new Set(existingFavorites.map(f => f.id))

    const newFavorites = importedFavorites.filter(fav => !existingIds.has(fav.id))

    // If no new favorites (all were duplicates), return info but still success
    if (newFavorites.length === 0 && importedFavorites.length > 0) {
      return { success: true, count: 0, error: 'All favorites already exist (duplicates skipped)' }
    }

    const mergedFavorites = [...newFavorites, ...existingFavorites]

    saveFavorites(mergedFavorites)

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('favoritesChanged'))

    return { success: true, count: newFavorites.length }
  } catch (error) {
    console.error('Error importing favorites:', error)
    return { success: false, count: 0, error: 'Failed to parse file' }
  }
}

export function getShowFavorites(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_FAVORITES_KEY)
    return stored === 'true'
  } catch (error) {
    console.error('Error reading show favorites setting:', error)
    return false
  }
}

export function setShowFavorites(show: boolean): void {
  try {
    localStorage.setItem(SHOW_FAVORITES_KEY, show.toString())
  } catch (error) {
    console.error('Error saving show favorites setting:', error)
  }
}

export function clearAllFavorites(): void {
  try {
    localStorage.removeItem(FAVORITES_KEY)
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('favoritesChanged'))
  } catch (error) {
    console.error('Error clearing favorites:', error)
  }
}
