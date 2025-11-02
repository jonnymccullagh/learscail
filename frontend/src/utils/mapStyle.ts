import type { StyleSpecification } from 'maplibre-gl'

export type MapStyleId = 'sraid-v1' | 'openfreemap' | 'esri-satellite'

export interface MapStyle {
  id: MapStyleId
  name: string
  nameGa: string
  url: string | StyleSpecification
}

// ESRI Satellite raster style object
const ESRI_SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri'
    }
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
}

export const MAP_STYLES: MapStyle[] = [
  {
    id: 'sraid-v1',
    name: 'OpenStreetMap Ireland (Irish)',
    nameGa: 'OpenStreetMap Éireann (Gaeilge)',
    url: 'https://tileserver.openstreetmap.ie/styles/sraid-v1/style.json'
  },
  {
    id: 'openfreemap',
    name: 'OpenFreeMap Liberty',
    nameGa: 'OpenFreeMap Liberty',
    url: 'https://tiles.openfreemap.org/styles/liberty'
  },
  {
    id: 'esri-satellite',
    name: 'Satellite Imagery (ESRI)',
    nameGa: 'Íomhánna Satailíte (ESRI)',
    url: ESRI_SATELLITE_STYLE
  }
]

const MAP_STYLE_KEY = 'mappa_map_style'

export function getMapStyle(): MapStyleId {
  try {
    const stored = localStorage.getItem(MAP_STYLE_KEY)
    if (stored && MAP_STYLES.find(s => s.id === stored)) {
      return stored as MapStyleId
    }
    return 'sraid-v1' // Default
  } catch (error) {
    console.error('Error reading map style:', error)
    return 'sraid-v1'
  }
}

export function saveMapStyle(styleId: MapStyleId): void {
  try {
    localStorage.setItem(MAP_STYLE_KEY, styleId)
  } catch (error) {
    console.error('Error saving map style:', error)
  }
}

export function getMapStyleUrl(styleId?: MapStyleId): string | StyleSpecification {
  const id = styleId || getMapStyle()
  const style = MAP_STYLES.find(s => s.id === id)
  return style?.url || MAP_STYLES[0].url
}
