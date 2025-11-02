  import { useEffect, useRef, useState } from 'react'
  import { useLocation } from 'react-router-dom'
  import maplibregl from 'maplibre-gl'
  import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
  import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
  import { open } from '@tauri-apps/plugin-shell'
  import { useTranslation } from 'react-i18next'
  import DetailPanel from './DetailPanel'
  import { saveHomeLocation, getHomeLocation, HomeLocation } from '../utils/homeLocation'
  import { saveMapView, getMapView } from '../utils/mapView'
  import { getHistory } from '../utils/history'
  import { getMapStyleUrl, getMapStyle, saveMapStyle, MAP_STYLES, type MapStyleId } from '../utils/mapStyle'
  import { getFavorites, getShowFavorites, addFavorite, type Favorite } from '../utils/favorites'

  interface MapProps {
    className?: string
  }

  interface ContextMenuState {
    show: boolean
    x: number
    y: number
    lat: number
    lng: number
    feature: any
  }

  function Map({ className = '' }: MapProps) {
    const { t } = useTranslation()
    const location = useLocation()
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const favoriteMarkersRef = useRef<maplibregl.Marker[]>([])
    const [detailPanelOpen, setDetailPanelOpen] = useState(false)
    const [selectedFeature, setSelectedFeature] = useState<any>(null)
    const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null)
    const [showFavorites, setShowFavorites] = useState(getShowFavorites())
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
      show: false,
      x: 0,
      y: 0,
      lat: 0,
      lng: 0,
      feature: null
    })
    const [showAddFavoriteDialog, setShowAddFavoriteDialog] = useState(false)
    const [newFavoriteName, setNewFavoriteName] = useState('')
    const [newFavoriteNotes, setNewFavoriteNotes] = useState('')
    const [pendingFavoriteCoords, setPendingFavoriteCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleId>(getMapStyle())

    // Load home location on mount
    useEffect(() => {
      setHomeLocation(getHomeLocation())
    }, [])

    // Load favorites on mount
    useEffect(() => {
      setFavorites(getFavorites())
    }, [])

    // Listen for favorites changes
    useEffect(() => {
      const handleFavoritesChanged = () => {
        setFavorites(getFavorites())
      }

      const handleShowFavoritesChanged = (event: Event) => {
        const customEvent = event as CustomEvent
        setShowFavorites(customEvent.detail)
      }

      window.addEventListener('favoritesChanged', handleFavoritesChanged)
      window.addEventListener('showFavoritesChanged', handleShowFavoritesChanged)
      return () => {
        window.removeEventListener('favoritesChanged', handleFavoritesChanged)
        window.removeEventListener('showFavoritesChanged', handleShowFavoritesChanged)
      }
    }, [])

    // Listen for map style changes
    useEffect(() => {
      const handleStyleChange = (event: Event) => {
        const customEvent = event as CustomEvent
        if (map.current) {
          map.current.setStyle(getMapStyleUrl(customEvent.detail))
          setCurrentMapStyle(customEvent.detail)
        }
      }

      window.addEventListener('mapStyleChanged', handleStyleChange)
      return () => {
        window.removeEventListener('mapStyleChanged', handleStyleChange)
      }
    }, [])

    // Update favorite markers when favorites or showFavorites changes
    useEffect(() => {
      if (!map.current) return

      // Remove existing favorite markers
      favoriteMarkersRef.current.forEach(marker => marker.remove())
      favoriteMarkersRef.current = []

      // Add new markers if showFavorites is true
      if (showFavorites && favorites.length > 0) {
        favorites.forEach(favorite => {
          // Create custom marker element (blue pin)
          const el = document.createElement('div')
          el.className = 'favorite-marker'
          el.innerHTML = `
            <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25c0-8.284-6.716-15-15-15z" fill="#3B82F6"/>
              <circle cx="15" cy="15" r="6" fill="white"/>
            </svg>
          `
          el.style.cursor = 'pointer'
          // Ensure the element can receive pointer events
          el.style.pointerEvents = 'auto'

          // Create popup with favorite name
          const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false
          })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold">${favorite.name}</h3>
                ${favorite.notes ? `<p class="text-sm text-gray-700 mt-1">${favorite.notes}</p>` : ''}
              </div>
            `)

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([favorite.coordinates.lng, favorite.coordinates.lat])
            .setPopup(popup)
            .addTo(map.current!)

          favoriteMarkersRef.current.push(marker)
        })
      }
    }, [favorites, showFavorites])

    useEffect(() => {
      if (map.current || !mapContainer.current) return

      // Try to restore previous map view
      const savedView = getMapView()
      const center = savedView
        ? [savedView.lng, savedView.lat] as [number, number]
        : [-7.316696130268866, 53.52693496472557] as [number, number] // Ireland
      const zoom = savedView ? savedView.zoom : 7

      // Define bounds for Ireland (with some padding to allow reasonable panning)
      // Southwest corner: [longitude, latitude]
      // Northeast corner: [longitude, latitude]
      const irelandBounds: [number, number, number, number] = [
        -12.0,  // West (longitude)
        50.0,   // South (latitude)
        -4.0,   // East (longitude)
        56.5    // North (latitude)
      ]

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: getMapStyleUrl(),
        center,
        zoom,
        minZoom: 6,
        maxZoom: 19,
        maxBounds: irelandBounds // Restrict panning to Ireland bounds
      })

      // Handle missing sprite images to suppress console warnings
      map.current.on('styleimagemissing', (e) => {
        const id = e.id // the id of the missing image
        // Create a simple 1x1 transparent placeholder image
        if (!map.current) return
        const width = 1
        const height = 1
        const data = new Uint8Array(width * height * 4)
        map.current.addImage(id, { width, height, data })
      })

      // Customize attribution text after map loads
      map.current.on('load', () => {
        const attributionDiv = document.querySelector('.maplibregl-ctrl-attrib-inner');
        if (attributionDiv) {
          attributionDiv.innerHTML = `<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap ${t('contributors')}</a>`;
        }
      });

      // Add geocoder with Nominatim API (add first so it appears at top)
      const geocoderApi = {
        forwardGeocode: async (config: any) => {
          const features = [];

          // If query is empty or very short, show suggestions (Home + recent history)
          if (!config.query || config.query.length <= 2) {
            // Add home location if set
            const home = getHomeLocation()
            if (home && home.coordinates) {
              const homeName = home.nameGa || home.name || t('home')
              features.push({
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: [home.coordinates.lng, home.coordinates.lat]
                },
                place_name: `🏠 ${homeName}`,
                properties: { type: 'home' },
                text: homeName,
                place_type: ['home'],
                center: [home.coordinates.lng, home.coordinates.lat]
              })
            }

            // Add 3 most recent history items
            const history = getHistory()
            const recentItems = history.slice(0, 3)
            for (const item of recentItems) {
              if (item.coordinates?.lat && item.coordinates?.lng) {
                const name = item.nameGa || item.name || t('unknownPlace')
                features.push({
                  type: 'Feature' as const,
                  geometry: {
                    type: 'Point' as const,
                    coordinates: [item.coordinates.lng, item.coordinates.lat]
                  },
                  place_name: `📍 ${name}`,
                  properties: { type: 'history' },
                  text: name,
                  place_type: ['history'],
                  center: [item.coordinates.lng, item.coordinates.lat]
                })
              }
            }

            // If showing suggestions, don't query Nominatim
            if (features.length > 0 && config.query.length === 0) {
              return {
                type: 'FeatureCollection' as const,
                features
              }
            }
          }

          // Query Nominatim for regular search
          try {
            const request =
              `https://nominatim.openstreetmap.org/search?q=${config.query}` +
              `&format=geojson&polygon_geojson=1&addressdetails=1` +
              `&viewbox=-11.0,55.5,-5.0,51.3&bounded=1`;

            const response = await fetch(request);
            const geojson = await response.json();

            for (const feature of geojson.features) {
              const center = [
                feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
                feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
              ];
              const point = {
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: center
                },
                place_name: feature.properties.display_name,
                properties: feature.properties,
                text: feature.properties.display_name,
                place_type: ['place'],
                center
              };
              features.push(point);
            }
          } catch (e) {
            console.error(`Failed to forwardGeocode with error: ${e}`);
          }

          return {
            type: 'FeatureCollection' as const,
            features
          };
        }
      };

      // Helper function to format values (replace underscores with spaces)
      const formatValue = (value: string) => {
        return String(value).replace(/_/g, ' ');
      };

      const geocoder = new MaplibreGeocoder(geocoderApi as any, {
        maplibregl,
        zoom: 8,  // Reduced zoom level (default is usually 14-16)
        marker: {
          _color: '#3b82f6'  // Blue marker color
        } as any,
        placeholder: t('search'),
        minLength: 0,  // Allow suggestions with 0 characters
        showResultsWhileTyping: true
      });

      // Trigger search on focus to show suggestions
      map.current.on('load', () => {
        const input = document.querySelector('.maplibregl-ctrl-geocoder input') as HTMLInputElement
        if (input) {
          input.addEventListener('focus', () => {
            // Trigger a search with empty query to show suggestions
            if (input.value === '') {
              const event = new Event('input', { bubbles: true })
              input.dispatchEvent(event)
            }
          })
        }
      })

      // Add popup to search result markers
      geocoder.on('result', (e: any) => {
        const result = e.result;

        if (result && result.place_name && map.current) {
          // Build popup content
          let popupContent = '<div class="p-3">';

          // Extract names from the place_name (format: "Name, Location, Country")
          const parts = result.place_name.split(',').map((p: string) => p.trim());

          if (parts.length > 0) {
            // First part is usually the main name
            popupContent += `<h3 class="text-base font-bold mb-2">${formatValue(parts[0])}</h3>`;

            // Additional location info
            if (parts.length > 1) {
              const locationInfo = parts.slice(1).join(', ');
              popupContent += `<p class="text-sm text-gray-600 mb-2">${formatValue(locationInfo)}</p>`;
            }
          }

          // Add properties if available
          if (result.properties) {
            const props = result.properties;

            if (props.type) {
              popupContent += `<p class="text-xs mb-1">Type: <strong class="font-bold">${formatValue(props.type)}</strong></p>`;
            }
            if (props.class) {
              popupContent += `<p class="text-xs mb-1">Type: <strong class="font-bold">${formatValue(props.class)}</strong></p>`;
            }
          }

          // Add "More" link
          popupContent += '<div class="mt-3 pt-2 border-t border-gray-200">';
          popupContent += `<a href="#" class="more-info-link-search text-blue-600 hover:text-blue-800 text-sm font-medium">${t('moreInformation')} →</a>`;
          popupContent += '</div>';

          popupContent += '</div>';

          // Capture the map reference
          const mapRef = map.current;

          // Create popup and attach to the result coordinates
          const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false
          })
            .setLngLat(result.center)
            .setHTML(popupContent)
            .addTo(mapRef);  // Show popup immediately

          // Add click listener to the marker to toggle popup
          // Wait a bit for the marker to be created by the geocoder
          setTimeout(() => {
            const markers = document.querySelectorAll('.maplibregl-marker');
            const lastMarker = markers[markers.length - 1] as HTMLElement;

            if (lastMarker) {
              lastMarker.style.cursor = 'pointer';

              // Increase clickable area by adding padding
              lastMarker.style.padding = '15px';
              lastMarker.style.margin = '-15px';

              // Make the marker slightly larger and more visible
              const markerSvg = lastMarker.querySelector('svg');
              if (markerSvg) {
                markerSvg.setAttribute('width', '35');
                markerSvg.setAttribute('height', '41');
              }

              // Toggle popup on click
              lastMarker.addEventListener('click', (event) => {
                event.stopPropagation();
                if (popup.isOpen()) {
                  popup.remove();
                } else {
                  popup.addTo(mapRef);
                }
              });
            }

            // Add click handler for "More" link in search results
            const moreLinkSearch = document.querySelector('.more-info-link-search');
            if (moreLinkSearch) {
              moreLinkSearch.addEventListener('click', (event) => {
                event.preventDefault();
                // Extract name from the result
                const mainName = parts.length > 0 ? parts[0] : result.place_name;
                setSelectedFeature({
                  name: mainName,
                  nameGa: result.properties?.['name:ga'],
                  nameEn: result.properties?.['name:en'] || mainName,
                  coordinates: { lat: result.center[1], lng: result.center[0] },
                  properties: result.properties || {}
                });
                setDetailPanelOpen(true);
              });
            }
          }, 100);
        }
      });

      map.current.addControl(geocoder, 'top-left');

      // Add navigation control at top right with margin for menu button
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add geolocation control below navigation
      const geolocateControl = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      });
      map.current.addControl(geolocateControl, 'top-right');

      // Add CSS to push top-right controls down to make room for menu button
      const style = document.createElement('style');
      style.textContent = `
        .maplibregl-ctrl-top-right {
          margin-top: 60px;
        }
      `;
      document.head.appendChild(style);

      // Automatically trigger geolocation on map load
      map.current.on('load', () => {
        geolocateControl.trigger();
      });

      // Save map view when user moves or zooms
      const saveCurrentView = () => {
        if (!map.current) return
        const center = map.current.getCenter()
        const zoom = map.current.getZoom()
        saveMapView({
          lat: center.lat,
          lng: center.lng,
          zoom: zoom
        })
      }

      // Save view on moveend (fires after pan, zoom, or any camera movement)
      map.current.on('moveend', saveCurrentView)

      // Add click handler to display feature information
      map.current.on('click', (e) => {
        if (!map.current) return;

        // Query features at the clicked point
        const features = map.current.queryRenderedFeatures(e.point);

        if (features.length > 0) {
          // Get the first feature (topmost)
          const feature = features[0];

          // Only show popup if feature has a name
          if (!feature.properties) return;
          const props = feature.properties;

          // Check if there's any name to display
          if (!props['name:ga'] && !props['name:en'] && !props['name']) {
            return; // No name, don't show popup
          }

          // Helper function to format values (replace underscores with spaces)
          const formatValue = (value: string) => {
            return String(value).replace(/_/g, ' ');
          };

          // Build popup content from feature properties (OSM data only, no Logainm)
          let popupContent = '<div class="p-3">';

          // Display Irish name prominently as title
          if (props['name:ga']) {
            popupContent += `<h3 class="text-base font-bold mb-2">${formatValue(props['name:ga'])}</h3>`;
            // Show English name underneath in smaller text if available
            if (props['name:en']) {
              popupContent += `<p class="text-sm text-gray-600 mb-2">${formatValue(props['name:en'])}</p>`;
            } else if (props['name']) {
              popupContent += `<p class="text-sm text-gray-600 mb-2">${formatValue(props['name'])}</p>`;
            }
          } else if (props['name:en']) {
            // If no Irish name, show English name as title
            popupContent += `<h3 class="text-base font-bold mb-2">${formatValue(props['name:en'])}</h3>`;
          } else if (props['name']) {
            // Show default name as title if no Irish or English name exists
            popupContent += `<h3 class="text-base font-bold mb-2">${formatValue(props['name'])}</h3>`;
          }

          // Add basic properties
          if (props.type) {
            popupContent += `<p class="text-xs mb-1">Type: <strong class="font-bold">${formatValue(props.type)}</strong></p>`;
          }
          if (props.class) {
            popupContent += `<p class="text-xs mb-1">Class: <strong class="font-bold">${formatValue(props.class)}</strong></p>`;
          }

          // Add "More" link
          popupContent += '<div class="mt-3 pt-2 border-t border-gray-200">';
          popupContent += `<a href="#" class="more-info-link text-blue-600 hover:text-blue-800 text-sm font-medium">${t('moreInformation')} →</a>`;
          popupContent += '</div>';

          popupContent += '</div>';

          // Create and display popup
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current);

          // Add click listener to "More" link
          setTimeout(() => {
            const moreLink = document.querySelector('.more-info-link');
            if (moreLink) {
              moreLink.addEventListener('click', (event) => {
                event.preventDefault();
                // Set selected feature and open detail panel
                setSelectedFeature({
                  name: props['name'],
                  nameGa: props['name:ga'],
                  nameEn: props['name:en'],
                  coordinates: { lat: e.lngLat.lat, lng: e.lngLat.lng },
                  properties: props
                });
                setDetailPanelOpen(true);
              });
            }
          }, 100);
        }
      });

      // Track hovered feature for highlighting
      let hoveredFeatureId: string | number | undefined = undefined;
      let hoveredSourceLayer: string | undefined = undefined;

      // Change cursor and highlight on hover over named features
      map.current.on('mousemove', (e) => {
        if (!map.current) return;

        const features = map.current.queryRenderedFeatures(e.point);

        // Find first feature with a name
        const namedFeature = features.find(f =>
          f.properties && (f.properties['name:ga'] || f.properties['name:en'] || f.properties['name'])
        );

        if (namedFeature) {
          map.current.getCanvas().style.cursor = 'pointer';

          // Highlight the feature if it has an id
          if (namedFeature.id !== undefined && namedFeature.source) {
            // Remove previous highlight
            if (hoveredFeatureId !== undefined && hoveredSourceLayer) {
              map.current.setFeatureState(
                { source: namedFeature.source, sourceLayer: hoveredSourceLayer, id: hoveredFeatureId },
                { hover: false }
              );
            }

            hoveredFeatureId = namedFeature.id;
            hoveredSourceLayer = namedFeature.sourceLayer || undefined;

            // Add new highlight
            map.current.setFeatureState(
              { source: namedFeature.source, sourceLayer: namedFeature.sourceLayer, id: namedFeature.id },
              { hover: true }
            );
          }
        } else {
          map.current.getCanvas().style.cursor = '';

          // Clear highlight if no named feature
          if (hoveredFeatureId !== undefined && hoveredSourceLayer && map.current) {
            const sources = map.current.getStyle()?.sources;
            if (sources) {
              Object.keys(sources).forEach(sourceId => {
                try {
                  map.current?.setFeatureState(
                    { source: sourceId, sourceLayer: hoveredSourceLayer, id: hoveredFeatureId! },
                    { hover: false }
                  );
                } catch (e) {
                  // Ignore errors for sources that don't support feature state
                }
              });
            }
            hoveredFeatureId = undefined;
            hoveredSourceLayer = undefined;
          }
        }
      });

      // Clear highlight when mouse leaves the map
      map.current.on('mouseleave', () => {
        if (!map.current || hoveredFeatureId === undefined) return;

        if (hoveredSourceLayer) {
          const sources = map.current.getStyle()?.sources;
          if (sources) {
            Object.keys(sources).forEach(sourceId => {
              try {
                map.current?.setFeatureState(
                  { source: sourceId, sourceLayer: hoveredSourceLayer, id: hoveredFeatureId! },
                  { hover: false }
                );
              } catch (e) {
                // Ignore errors
              }
            });
          }
        }
        hoveredFeatureId = undefined;
        hoveredSourceLayer = undefined;
      });

      // Add right-click context menu
      map.current.on('contextmenu', (e) => {
        if (!map.current) return;

        // Prevent default context menu
        e.preventDefault();

        // Query features at the right-clicked point
        const features = map.current.queryRenderedFeatures(e.point);
        const feature = features.length > 0 ? features[0] : null;

        // Show context menu
        setContextMenu({
          show: true,
          x: e.point.x,
          y: e.point.y,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          feature: feature
        });
      });

      // Close context menu on left click
      map.current.on('click', () => {
        setContextMenu(prev => ({ ...prev, show: false }));
      });

      // Update URL hash when map moves (web version only)
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
      if (!isTauri) {
        map.current.on('moveend', () => {
          if (!map.current) return;
          const center = map.current.getCenter();
          const zoom = map.current.getZoom();
          const lat = center.lat.toFixed(5);
          const lng = center.lng.toFixed(5);
          const z = zoom.toFixed(0);

          // Update the location hash as #map=zoom/lat/lng
          window.location.hash = `#map=${z}/${lat}/${lng}`;
        });
      }

      return () => {
        map.current?.remove()
        map.current = null
      }
    }, [])

    // Handle URL hash changes to zoom to coordinates
    useEffect(() => {
      if (!map.current) return

      const hash = location.hash
      if (hash && hash.startsWith('#map=')) {
        // Parse hash format: #map=zoom/lat/lng
        const parts = hash.replace('#map=', '').split('/')
        if (parts.length === 3) {
          const zoom = parseFloat(parts[0])
          const lat = parseFloat(parts[1])
          const lng = parseFloat(parts[2])

          if (!isNaN(zoom) && !isNaN(lat) && !isNaN(lng)) {
            // Check if map is already at this position (within tolerance)
            const currentCenter = map.current.getCenter()
            const currentZoom = map.current.getZoom()
            const latDiff = Math.abs(currentCenter.lat - lat)
            const lngDiff = Math.abs(currentCenter.lng - lng)
            const zoomDiff = Math.abs(currentZoom - zoom)

            // Only move if significantly different (avoid infinite loop)
            if (latDiff > 0.0001 || lngDiff > 0.0001 || zoomDiff > 0.5) {
              map.current.flyTo({
                center: [lng, lat],
                zoom: zoom, // Use the zoom from hash, don't add 2
                essential: true
              })
            }
          }
        }
      }
    }, [location.hash])

    const handleCopyCoordinates = () => {
      const coords = `${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`
      navigator.clipboard.writeText(coords).then(() => {
        console.log('Coordinates copied to clipboard:', coords)
      }).catch(err => {
        console.error('Failed to copy coordinates:', err)
      })
      setContextMenu(prev => ({ ...prev, show: false }))
    }

    const handleCopyURL = () => {
      if (!map.current) return

      const zoom = map.current.getZoom().toFixed(0)
      const lat = contextMenu.lat.toFixed(5)
      const lng = contextMenu.lng.toFixed(5)

      // Build the full URL with the current location
      const baseUrl = window.location.origin + window.location.pathname
      const url = `${baseUrl}#map=${zoom}/${lat}/${lng}`

      navigator.clipboard.writeText(url).then(() => {
        console.log('URL copied to clipboard:', url)
      }).catch(err => {
        console.error('Failed to copy URL:', err)
      })
      setContextMenu(prev => ({ ...prev, show: false }))
    }

    const handleViewInOSM = async () => {
      // Check if we're in a Tauri context
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
      console.log('Is Tauri:', isTauri)
      console.log('Window object:', window)
      console.log('__TAURI__ in window:', '__TAURI__' in window)

      let url: string
      if (contextMenu.feature && contextMenu.feature.properties && contextMenu.feature.properties.osm_id) {
        // Construct OSM URL based on feature type
        const osmId = contextMenu.feature.properties.osm_id
        const osmType = contextMenu.feature.properties.osm_type || contextMenu.feature.sourceLayer
        url = `https://www.openstreetmap.org/${osmType}/${osmId}`
        console.log('Opening OSM feature URL:', url)
      } else {
        // If no feature, just open OSM at the coordinates
        url = `https://www.openstreetmap.org/#map=18/${contextMenu.lat}/${contextMenu.lng}`
        console.log('Opening OSM coordinates URL:', url)
      }

      // Use Tauri shell API if in Tauri, otherwise use window.open
      if (isTauri) {
        console.log('Using Tauri shell API to open:', url)
        try {
          await open(url)
          console.log('Successfully called open()')
        } catch (err) {
          console.error('Failed to open URL in default browser:', err)
        }
      } else {
        console.log('Using window.open to open:', url)
        window.open(url, '_blank')
      }

      setContextMenu(prev => ({ ...prev, show: false }))
    }

    const handleSetHomeLocation = () => {
      const props = contextMenu.feature?.properties

      const newHomeLocation = {
        name: props?.['name'],
        nameGa: props?.['name:ga'],
        nameEn: props?.['name:en'],
        coordinates: {
          lat: contextMenu.lat,
          lng: contextMenu.lng
        }
      }

      saveHomeLocation(newHomeLocation)
      setHomeLocation(newHomeLocation)

      setContextMenu(prev => ({ ...prev, show: false }))
    }

    const handleShowHome = () => {
      if (!map.current || !homeLocation) return

      map.current.flyTo({
        center: [homeLocation.coordinates.lng, homeLocation.coordinates.lat],
        zoom: 15,
        essential: true
      })

      setContextMenu(prev => ({ ...prev, show: false }))
    }

    const handleToggleShowFavorites = () => {
      const newValue = !showFavorites
      setShowFavorites(newValue) // Update utility function
      window.dispatchEvent(new CustomEvent('showFavoritesChanged', { detail: newValue }))
      setContextMenu(prev => ({ ...prev, show: false }))
    }

    const handleAddToFavorites = () => {
      setPendingFavoriteCoords({ lat: contextMenu.lat, lng: contextMenu.lng })
      setContextMenu(prev => ({ ...prev, show: false }))
      setShowAddFavoriteDialog(true)
    }

    const handleSaveNewFavorite = () => {
      if (newFavoriteName.trim() && pendingFavoriteCoords) {
        addFavorite({
          name: newFavoriteName.trim(),
          coordinates: pendingFavoriteCoords,
          notes: newFavoriteNotes.trim() || undefined
        })
        setFavorites(getFavorites())
        setShowAddFavoriteDialog(false)
        setNewFavoriteName('')
        setNewFavoriteNotes('')
        setPendingFavoriteCoords(null)
      }
    }

    const handleCancelAddFavorite = () => {
      setShowAddFavoriteDialog(false)
      setNewFavoriteName('')
      setNewFavoriteNotes('')
      setPendingFavoriteCoords(null)
    }

    const handleChangeMapStyle = (styleId: MapStyleId) => {
      if (map.current) {
        map.current.setStyle(getMapStyleUrl(styleId))
        saveMapStyle(styleId)
        setCurrentMapStyle(styleId)
        window.dispatchEvent(new CustomEvent('mapStyleChanged', { detail: styleId }))
      }
    }

    return (
      <>
        <div ref={mapContainer} className={className} />

        <DetailPanel
          isOpen={detailPanelOpen}
          onClose={() => setDetailPanelOpen(false)}
          feature={selectedFeature}
        />

        {/* Context Menu */}
        {contextMenu.show && (
          <div
            className="fixed bg-white shadow-lg rounded-md border border-gray-200 py-1 z-50"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={handleCopyCoordinates}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t('copyCoordinates')}
            </button>
            <button
              onClick={handleCopyURL}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {t('copyURLToLocation')}
            </button>
            <button
              onClick={handleViewInOSM}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {t('viewInOpenStreetMap')}
            </button>
            {homeLocation && homeLocation.coordinates && (
              <button
                onClick={handleShowHome}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {t('showHome')}
              </button>
            )}
            <button
              onClick={handleSetHomeLocation}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t('setAsHomeLocation')}
            </button>
            <button
              onClick={handleAddToFavorites}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {t('addFavorite')}
            </button>
            <button
              onClick={handleToggleShowFavorites}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              {showFavorites ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
              {showFavorites ? t('hideFavorites') : t('showFavorites')}
            </button>
          </div>
        )}

        {/* Add Favorite Dialog */}
        {showAddFavoriteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full m-4">
              <h2 className="text-xl font-bold mb-4">{t('addFavorite')}</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('favoriteName')}</label>
                <input
                  type="text"
                  value={newFavoriteName}
                  onChange={(e) => setNewFavoriteName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleSaveNewFavorite()
                    if (e.key === 'Escape') handleCancelAddFavorite()
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('favoriteNamePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={newFavoriteNotes}
                  onChange={(e) => setNewFavoriteNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add any notes about this location..."
                  rows={3}
                />
              </div>
              {pendingFavoriteCoords && (
                <p className="text-sm text-gray-600 mb-4">
                  {pendingFavoriteCoords.lat.toFixed(6)}, {pendingFavoriteCoords.lng.toFixed(6)}
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelAddFavorite}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveNewFavorite}
                  disabled={!newFavoriteName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Style Switcher */}
        <div className="fixed bottom-20 left-4 z-40 flex gap-2">
          {MAP_STYLES.map((style) => {
            const isActive = currentMapStyle === style.id
            const thumbnailMap = {
              'sraid-v1': '/map-style-sraid-v1.jpeg',
              'osm-ie': '/map-style-ga.jpeg',
              'osm-ie-alt': '/map-style-ga.jpeg',
              'openfreemap': '/map-style-liberty.jpeg',
              'esri-satellite': '/map-style-satellite.jpeg'
            }
            return (
              <button
                key={style.id}
                onClick={() => handleChangeMapStyle(style.id)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  isActive ? 'border-blue-600 shadow-lg' : 'border-white shadow-md'
                }`}
                title={style.name}
              >
                <img
                  src={thumbnailMap[style.id]}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
              </button>
            )
          })}
        </div>
      </>
    )
  }

  export default Map