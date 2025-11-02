import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import maplibregl from 'maplibre-gl'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import { queryRoute, formatDistance, formatDuration, getTurnInstruction, type RoutePoint, type RouteResponse } from '../../utils/routing'
import { getHistory, addToHistory, type HistoryItem } from '../../utils/history'
import { getDirectionsData, saveDirectionsData } from '../../utils/directionsStorage'
import { getHomeLocation } from '../../utils/homeLocation'

interface SearchResult {
  lat: number
  lon: number
  display_name: string
}

function Directions() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const startMarkerRef = useRef<maplibregl.Marker | null>(null)
  const endMarkerRef = useRef<maplibregl.Marker | null>(null)

  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null)
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null)
  const [startName, setStartName] = useState('')
  const [endName, setEndName] = useState('')
  const [startSearchResults, setStartSearchResults] = useState<SearchResult[]>([])
  const [endSearchResults, setEndSearchResults] = useState<SearchResult[]>([])
  const [searchingStart, setSearchingStart] = useState(false)
  const [searchingEnd, setSearchingEnd] = useState(false)
  const [selectingMode, setSelectingMode] = useState<'start' | 'end' | null>(null)
  const [showStartResults, setShowStartResults] = useState(true)
  const [showEndResults, setShowEndResults] = useState(true)
  const [profile, setProfile] = useState<'car' | 'foot' | 'bike'>('car')
  const [route, setRoute] = useState<RouteResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStartHistorySuggestions, setShowStartHistorySuggestions] = useState(false)
  const [showEndHistorySuggestions, setShowEndHistorySuggestions] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  // Initialize from storage or history on page load
  useEffect(() => {
    // First try to load from storage
    const stored = getDirectionsData()

    if (stored) {
      // Restore from storage
      if (stored.startPoint) {
        setStartPoint(stored.startPoint)
        setStartName(stored.startName)
      }
      if (stored.endPoint) {
        setEndPoint(stored.endPoint)
        setEndName(stored.endName)
      }
      if (stored.route) {
        setRoute(stored.route)
      }
      if (stored.profile) {
        setProfile(stored.profile)
      }
    } else {
      // Fall back to history for start location only
      const history = getHistory()
      if (history.length > 0 && history[0].coordinates) {
        const recentLocation = history[0]
        const displayName = language === 'ga'
          ? (recentLocation.nameGa || recentLocation.nameEn || recentLocation.name)
          : (recentLocation.nameEn || recentLocation.name || recentLocation.nameGa)

        const coords = {
          lat: Number(recentLocation.coordinates!.lat),
          lng: Number(recentLocation.coordinates!.lng)
        }

        setStartPoint(coords)
        setStartName(displayName || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`)
      }
    }
  }, [language])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tileserver.openstreetmap.ie/styles/ga/style.json",
      center: [-7.316696130268866, 53.52693496472557],
      zoom: 7,
      maxZoom: 19
    })

    // Customize attribution text after map loads
    map.current.on('load', () => {
      const attributionDiv = document.querySelector('.maplibregl-ctrl-attrib-inner')
      if (attributionDiv) {
        attributionDiv.innerHTML = `<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap ${t('contributors')}</a>`
      }
    })

    return () => {
      if (startMarkerRef.current) {
        startMarkerRef.current.remove()
        startMarkerRef.current = null
      }
      if (endMarkerRef.current) {
        endMarkerRef.current.remove()
        endMarkerRef.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Handle cursor change when in selecting mode
  useEffect(() => {
    if (!map.current) return

    const canvas = map.current.getCanvas()
    if (selectingMode) {
      canvas.style.cursor = 'crosshair'
    } else {
      canvas.style.cursor = ''
    }
  }, [selectingMode])

  // Handle map click for location selection
  useEffect(() => {
    if (!map.current) return

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (selectingMode) {
        const { lng, lat } = e.lngLat

        if (selectingMode === 'start') {
          setStartPoint({ lat, lng })
          setStartName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)

          // Update start marker
          if (startMarkerRef.current) {
            startMarkerRef.current.remove()
          }
          startMarkerRef.current = new maplibregl.Marker({ color: '#22c55e' })
            .setLngLat([lng, lat])
            .addTo(map.current!)

          setSelectingMode(null)
        } else if (selectingMode === 'end') {
          setEndPoint({ lat, lng })
          setEndName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)

          // Update end marker
          if (endMarkerRef.current) {
            endMarkerRef.current.remove()
          }
          endMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
            .setLngLat([lng, lat])
            .addTo(map.current!)

          setSelectingMode(null)
        }
      }
    }

    map.current.on('click', handleMapClick)

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick)
      }
    }
  }, [selectingMode])

  // Update markers when start/end points change
  useEffect(() => {
    if (!map.current) return

    // Update start marker
    if (startPoint) {
      if (startMarkerRef.current) {
        startMarkerRef.current.remove()
      }
      startMarkerRef.current = new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat([startPoint.lng, startPoint.lat])
        .addTo(map.current)

      // Zoom to start location on initial load
      if (initialLoad) {
        map.current.flyTo({
          center: [startPoint.lng, startPoint.lat],
          zoom: 13
        })
        setInitialLoad(false)
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.remove()
      startMarkerRef.current = null
    }

    // Update end marker
    if (endPoint) {
      if (endMarkerRef.current) {
        endMarkerRef.current.remove()
      }
      endMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat([endPoint.lng, endPoint.lat])
        .addTo(map.current)
    } else if (endMarkerRef.current) {
      endMarkerRef.current.remove()
      endMarkerRef.current = null
    }
  }, [startPoint, endPoint])

  // Draw route on map when route data changes
  useEffect(() => {
    if (!map.current || !route || !route.paths || route.paths.length === 0) return

    const path = route.paths[0]

    // Validate path data structure
    if (!path || !path.points || !path.points.coordinates || path.points.coordinates.length === 0) {
      console.warn('Invalid route path data')
      return
    }

    try {
      // Remove existing route layer
      if (map.current.getLayer('route')) {
        map.current.removeLayer('route')
      }
      if (map.current.getSource('route')) {
        map.current.removeSource('route')
      }

      // Add route line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: path.points.coordinates
          }
        }
      })

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4
        }
      })

      // Fit bounds to route
      const coordinates = path.points.coordinates
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord as [number, number])
      }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]))

      map.current.fitBounds(bounds, {
        padding: 50
      })
    } catch (err) {
      console.error('Error drawing route on map:', err)
    }
  }, [route])

  // Save to storage whenever relevant state changes
  useEffect(() => {
    saveDirectionsData({
      startPoint,
      endPoint,
      startName,
      endName,
      route,
      profile
    })
  }, [startPoint, endPoint, startName, endName, route, profile])

  // Geocoding search
  const searchLocation = async (query: string, isStart: boolean) => {
    if (query.length < 3) {
      if (isStart) setStartSearchResults([])
      else setEndSearchResults([])
      return
    }

    if (isStart) setSearchingStart(true)
    else setSearchingEnd(true)

    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.append('q', query)
      url.searchParams.append('format', 'json')
      url.searchParams.append('addressdetails', '1')
      url.searchParams.append('viewbox', '-11.0,55.5,-5.0,51.3')
      url.searchParams.append('bounded', '1')
      url.searchParams.append('limit', '5')

      const response = await fetch(url.toString())
      const results = await response.json()

      if (isStart) {
        setStartSearchResults(results)
      } else {
        setEndSearchResults(results)
      }
    } catch (err) {
      console.error('Geocoding error:', err)
    } finally {
      if (isStart) setSearchingStart(false)
      else setSearchingEnd(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(startName, true)
    }, 300)
    return () => clearTimeout(timer)
  }, [startName])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(endName, false)
    }, 300)
    return () => clearTimeout(timer)
  }, [endName])

  const selectSearchResult = (result: SearchResult, isStart: boolean) => {
    const point = { lat: result.lat, lng: result.lon }
    const name = result.display_name

    // Add to history
    addToHistory({
      name: name,
      coordinates: point
    })

    if (isStart) {
      setStartPoint(point)
      setStartName(name)
      setStartSearchResults([])
      setShowStartResults(false)

      // Update marker
      if (startMarkerRef.current) {
        startMarkerRef.current.remove()
      }
      startMarkerRef.current = new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat([point.lng, point.lat])
        .addTo(map.current!)

      // Pan map to start location
      if (map.current) {
        map.current.flyTo({
          center: [point.lng, point.lat],
          zoom: 13
        })
      }
    } else {
      setEndPoint(point)
      setEndName(name)
      setEndSearchResults([])
      setShowEndResults(false)

      // Update marker
      if (endMarkerRef.current) {
        endMarkerRef.current.remove()
      }
      endMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat([point.lng, point.lat])
        .addTo(map.current!)

      // Don't pan map for end location - keep focused on start
    }
  }

  // Select history item for start location
  const selectStartHistoryItem = (item: HistoryItem) => {
    if (!item.coordinates) return

    const point = { lat: Number(item.coordinates.lat), lng: Number(item.coordinates.lng) }

    // Check if this is the home location
    const homeLocation = getHomeLocation()
    const isHome = homeLocation &&
                   Math.abs(homeLocation.coordinates.lat - point.lat) < 0.0001 &&
                   Math.abs(homeLocation.coordinates.lng - point.lng) < 0.0001

    const name = isHome ? t('home') : (item.name || item.nameEn || item.nameGa || 'Unknown location')

    setStartPoint(point)
    setStartName(name)
    setShowStartHistorySuggestions(false)

    // Update marker
    if (startMarkerRef.current) {
      startMarkerRef.current.remove()
    }
    startMarkerRef.current = new maplibregl.Marker({ color: '#22c55e' })
      .setLngLat([point.lng, point.lat])
      .addTo(map.current!)

    // Pan map to selected location
    if (map.current) {
      map.current.flyTo({
        center: [point.lng, point.lat],
        zoom: 13
      })
    }
  }

  // Select history item for end location
  const selectEndHistoryItem = (item: HistoryItem) => {
    if (!item.coordinates) return

    const point = { lat: Number(item.coordinates.lat), lng: Number(item.coordinates.lng) }

    // Check if this is the home location
    const homeLocation = getHomeLocation()
    const isHome = homeLocation &&
                   Math.abs(homeLocation.coordinates.lat - point.lat) < 0.0001 &&
                   Math.abs(homeLocation.coordinates.lng - point.lng) < 0.0001

    const name = isHome ? t('home') : (item.name || item.nameEn || item.nameGa || 'Unknown location')

    setEndPoint(point)
    setEndName(name)
    setShowEndHistorySuggestions(false)

    // Update marker
    if (endMarkerRef.current) {
      endMarkerRef.current.remove()
    }
    endMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
      .setLngLat([point.lng, point.lat])
      .addTo(map.current!)

    // Pan map to selected location
    if (map.current) {
      map.current.flyTo({
        center: [point.lng, point.lat],
        zoom: 13
      })
    }
  }

  const calculateRoute = async () => {
    if (!startPoint || !endPoint) {
      setError('Please select both start and end locations')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await queryRoute(startPoint, endPoint, profile)

      // Handle errors from the API
      if (result.error) {
        if (result.error.type === 'rate_limit') {
          setError(t('routingRateLimitError'))
        } else {
          setError(t('routingApiError'))
        }
        setRoute(null)
        return
      }

      // Check if we have valid route data
      if (!result.data || !result.data.paths || result.data.paths.length === 0) {
        setError('No route found')
        setRoute(null)
        return
      }

      setRoute(result.data)
      // Route drawing is now handled by the useEffect hook
    } catch (err) {
      setError(t('routingApiError'))
      console.error('Route calculation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearRoute = () => {
    setStartPoint(null)
    setEndPoint(null)
    setStartName('')
    setEndName('')
    setRoute(null)
    setError(null)
    setSelectingMode(null)

    // Clear markers
    if (startMarkerRef.current) {
      startMarkerRef.current.remove()
      startMarkerRef.current = null
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove()
      endMarkerRef.current = null
    }

    // Clear map
    if (map.current) {
      if (map.current.getLayer('route')) {
        map.current.removeLayer('route')
      }
      if (map.current.getSource('route')) {
        map.current.removeSource('route')
      }
      map.current.getCanvas().style.cursor = ''
    }
  }

  return (
    <div className="h-full flex flex-col p-6 pb-20">
      <h1 className="text-2xl font-bold mb-4">{t('directions')}</h1>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="space-y-4">
          {/* Start Location */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('startLocation')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter starting point or click map"
                  value={startName}
                  onFocus={() => {
                    setRoute(null)
                    // Show history suggestions when focused and field is empty
                    if (!startName || startName.trim() === '') {
                      setShowStartHistorySuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    // Hide suggestions when focus moves away
                    setTimeout(() => {
                      setShowStartHistorySuggestions(false)
                      setShowStartResults(false)
                    }, 200) // Delay to allow click on suggestion
                  }}
                  onChange={(e) => {
                    setStartName(e.target.value)
                    setShowStartResults(true)
                    setShowStartHistorySuggestions(false) // Hide history when typing
                  }}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Clear button */}
                {startName && (
                  <button
                    onClick={() => {
                      setStartName('')
                      setStartPoint(null)
                      if (startMarkerRef.current) {
                        startMarkerRef.current.remove()
                        startMarkerRef.current = null
                      }
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {searchingStart && (
                  <div className="absolute right-10 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {/* History suggestions dropdown */}
                {showStartHistorySuggestions && !startName && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const homeLocation = getHomeLocation()
                      const history = getHistory().slice(0, 3) // Get last 3 items
                      const hasItems = homeLocation || history.length > 0

                      if (!hasItems) {
                        return (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No recent locations
                          </div>
                        )
                      }

                      return (
                        <>
                          {homeLocation && (
                            <button
                              onClick={() => selectStartHistoryItem({
                                name: homeLocation.name,
                                nameGa: homeLocation.nameGa,
                                nameEn: homeLocation.nameEn,
                                coordinates: homeLocation.coordinates,
                                timestamp: Date.now()
                              })}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <div className="font-medium">Home</div>
                              </div>
                              {homeLocation.coordinates && (
                                <div className="text-xs text-gray-500 ml-6">
                                  {Number(homeLocation.coordinates.lat).toFixed(4)}, {Number(homeLocation.coordinates.lng).toFixed(4)}
                                </div>
                              )}
                            </button>
                          )}
                          {history.map((item, index) => (
                            <button
                              key={index}
                              onClick={() => selectStartHistoryItem(item)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{item.name || item.nameEn || item.nameGa || 'Unknown location'}</div>
                              {item.coordinates && (
                                <div className="text-xs text-gray-500">
                                  {Number(item.coordinates.lat).toFixed(4)}, {Number(item.coordinates.lng).toFixed(4)}
                                </div>
                              )}
                            </button>
                          ))}
                        </>
                      )
                    })()}
                  </div>
                )}
                {/* Search results dropdown */}
                {startSearchResults.length > 0 && showStartResults && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {startSearchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectSearchResult(result, true)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setRoute(null)
                  const newMode = selectingMode === 'start' ? null : 'start'
                  setSelectingMode(newMode)

                  // When entering selection mode, zoom to most recent history location
                  if (newMode === 'start' && map.current) {
                    const history = getHistory()
                    if (history.length > 0 && history[0].coordinates) {
                      map.current.flyTo({
                        center: [history[0].coordinates.lng, history[0].coordinates.lat],
                        zoom: 13
                      })
                    }
                  }
                }}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectingMode === 'start'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectingMode === 'start' ? '✓ Click Map' : '📍'}
              </button>
            </div>
          </div>

          {/* End Location */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endLocation')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter destination or click map"
                  value={endName}
                  onFocus={() => {
                    setRoute(null)
                    // Show history suggestions when focused and field is empty
                    if (!endName || endName.trim() === '') {
                      setShowEndHistorySuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    // Hide suggestions when focus moves away
                    setTimeout(() => {
                      setShowEndHistorySuggestions(false)
                      setShowEndResults(false)
                    }, 200) // Delay to allow click on suggestion
                  }}
                  onChange={(e) => {
                    setEndName(e.target.value)
                    setShowEndResults(true)
                    setShowEndHistorySuggestions(false) // Hide history when typing
                  }}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Clear button */}
                {endName && (
                  <button
                    onClick={() => {
                      setEndName('')
                      setEndPoint(null)
                      if (endMarkerRef.current) {
                        endMarkerRef.current.remove()
                        endMarkerRef.current = null
                      }
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {searchingEnd && (
                  <div className="absolute right-10 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {/* History suggestions dropdown */}
                {showEndHistorySuggestions && !endName && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const homeLocation = getHomeLocation()
                      const history = getHistory().slice(0, 3) // Get last 3 items
                      const hasItems = homeLocation || history.length > 0

                      if (!hasItems) {
                        return (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No recent locations
                          </div>
                        )
                      }

                      return (
                        <>
                          {homeLocation && (
                            <button
                              onClick={() => selectEndHistoryItem({
                                name: homeLocation.name,
                                nameGa: homeLocation.nameGa,
                                nameEn: homeLocation.nameEn,
                                coordinates: homeLocation.coordinates,
                                timestamp: Date.now()
                              })}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <div className="font-medium">Home</div>
                              </div>
                              {homeLocation.coordinates && (
                                <div className="text-xs text-gray-500 ml-6">
                                  {Number(homeLocation.coordinates.lat).toFixed(4)}, {Number(homeLocation.coordinates.lng).toFixed(4)}
                                </div>
                              )}
                            </button>
                          )}
                          {history.map((item, index) => (
                            <button
                              key={index}
                              onClick={() => selectEndHistoryItem(item)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{item.name || item.nameEn || item.nameGa || 'Unknown location'}</div>
                              {item.coordinates && (
                                <div className="text-xs text-gray-500">
                                  {Number(item.coordinates.lat).toFixed(4)}, {Number(item.coordinates.lng).toFixed(4)}
                                </div>
                              )}
                            </button>
                          ))}
                        </>
                      )
                    })()}
                  </div>
                )}
                {/* Search results dropdown */}
                {endSearchResults.length > 0 && showEndResults && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {endSearchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectSearchResult(result, false)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setRoute(null)
                  const newMode = selectingMode === 'end' ? null : 'end'
                  setSelectingMode(newMode)

                  // Don't pan map when selecting end location - keep focused on start
                }}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectingMode === 'end'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectingMode === 'end' ? '✓ Click Map' : '📍'}
              </button>
            </div>
          </div>

          {/* Selecting mode indicator */}
          {selectingMode && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm">
              Click on the map to set {selectingMode === 'start' ? 'start' : 'end'} location
            </div>
          )}

          {/* Transport Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('transportMode')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setProfile('car')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  profile === 'car'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🚗 {t('car')}
              </button>
              <button
                onClick={() => setProfile('bike')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  profile === 'bike'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🚴 {t('bike')}
              </button>
              <button
                onClick={() => setProfile('foot')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  profile === 'foot'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🚶 {t('walk')}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={calculateRoute}
              disabled={loading || !startPoint || !endPoint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Calculating...' : t('getDirections')}
            </button>
            <button
              onClick={clearRoute}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
            >
              {t('clear')}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Route Summary */}
          {route && route.paths[0] && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-blue-900">
                    {formatDistance(route.paths[0].distance)}
                  </p>
                  <p className="text-sm text-blue-700">
                    {formatDuration(route.paths[0].time)}
                  </p>
                </div>
                <div className="text-blue-900">
                  {profile === 'car' && '🚗'}
                  {profile === 'bike' && '🚴'}
                  {profile === 'foot' && '🚶'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[400px] bg-gray-100 rounded-lg shadow-md overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {/* Turn-by-turn Instructions */}
      {route && route.paths[0] && route.paths[0].instructions && (
        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <h2 className="font-semibold text-lg mb-3">{t('turnByTurnDirections')}</h2>
          <div className="space-y-2">
            {route.paths[0].instructions.map((instruction, index) => (
              <div key={index} className="flex gap-3 p-2 hover:bg-gray-50 rounded">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {getTurnInstruction(instruction.sign)}
                  </p>
                  {instruction.street_name && (
                    <p className="text-sm text-gray-600">
                      onto {instruction.street_name}
                    </p>
                  )}
                  {instruction.text && instruction.text !== instruction.street_name && (
                    <p className="text-sm text-gray-600">{instruction.text}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistance(instruction.distance)}
                    {instruction.time > 0 && ` • ${formatDuration(instruction.time)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacing for navigation bar */}
      <div className="pb-20"></div>
    </div>
  )
}

export default Directions
