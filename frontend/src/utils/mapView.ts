export interface MapView {
  zoom: number
  lat: number
  lng: number
}

const MAP_VIEW_KEY = 'mappa_map_view'

export function getMapView(): MapView | null {
  try {
    const stored = localStorage.getItem(MAP_VIEW_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading map view:', error)
    return null
  }
}

export function saveMapView(view: MapView): void {
  try {
    localStorage.setItem(MAP_VIEW_KEY, JSON.stringify(view))
  } catch (error) {
    console.error('Error saving map view:', error)
  }
}
