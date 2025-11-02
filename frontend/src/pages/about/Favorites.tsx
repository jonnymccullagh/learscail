import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { save, confirm as tauriConfirm } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  updateFavorite,
  exportFavoritesToGeoJSON,
  importFavoritesFromGeoJSON,
  getShowFavorites,
  setShowFavorites as saveShowFavorites,
  clearAllFavorites,
  type Favorite
} from '../../utils/favorites'
import { getMapView } from '../../utils/mapView'
import { getMapStyleUrl } from '../../utils/mapStyle'

function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newFavName, setNewFavName] = useState('')
  const [newFavNotes, setNewFavNotes] = useState('')
  const [newFavLat, setNewFavLat] = useState('')
  const [newFavLng, setNewFavLng] = useState('')
  const [showFavorites, setShowFavorites] = useState(getShowFavorites())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  useEffect(() => {
    loadFavorites()
  }, [])

  const handleToggleShowFavorites = () => {
    const newValue = !showFavorites
    setShowFavorites(newValue)
    saveShowFavorites(newValue)
    window.dispatchEvent(new CustomEvent('showFavoritesChanged', { detail: newValue }))
  }

  // Initialize map when add dialog opens
  useEffect(() => {
    if (showAddDialog && mapContainerRef.current && !mapRef.current) {
      // Get saved map view or use default Ireland center
      const savedView = getMapView()
      const center = savedView
        ? [savedView.lng, savedView.lat] as [number, number]
        : [-7.316696130268866, 53.52693496472557] as [number, number]
      const zoom = savedView ? savedView.zoom : 7

      // Initialize map
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: getMapStyleUrl(),
        center: center,
        zoom: zoom
      })

      // Add click handler to place/move marker
      map.on('click', (e) => {
        const { lng, lat } = e.lngLat

        // Update input fields
        setNewFavLat(lat.toFixed(6))
        setNewFavLng(lng.toFixed(6))

        // Remove existing marker if any
        if (markerRef.current) {
          markerRef.current.remove()
        }

        // Create draggable marker
        const marker = new maplibregl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(map)

        // Update coordinates when marker is dragged
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          setNewFavLat(lngLat.lat.toFixed(6))
          setNewFavLng(lngLat.lng.toFixed(6))
        })

        markerRef.current = marker
      })

      mapRef.current = map
    }

    // Cleanup map when dialog closes
    return () => {
      if (!showAddDialog && mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [showAddDialog])

  const loadFavorites = () => {
    setFavorites(getFavorites())
  }

  const handleAddFavorite = () => {
    const lat = parseFloat(newFavLat)
    const lng = parseFloat(newFavLng)

    if (!newFavName.trim()) {
      alert(t('favoriteNameRequired'))
      return
    }

    if (isNaN(lat) || isNaN(lng)) {
      alert(t('favoriteInvalidCoordinates'))
      return
    }

    addFavorite({
      name: newFavName.trim(),
      coordinates: { lat, lng },
      notes: newFavNotes.trim() || undefined
    })

    setNewFavName('')
    setNewFavNotes('')
    setNewFavLat('')
    setNewFavLng('')
    setShowAddDialog(false)
    loadFavorites()
  }

  const handleRemoveFavorite = async (id: string) => {
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

    let confirmed = false
    if (isTauri) {
      confirmed = await tauriConfirm(t('favoriteDeleteConfirm'), {
        title: t('delete'),
        kind: 'warning'
      })
    } else {
      confirmed = window.confirm(t('favoriteDeleteConfirm'))
    }

    if (confirmed) {
      removeFavorite(id)
      loadFavorites()
    }
  }

  const handleStartEdit = (favorite: Favorite) => {
    setEditingId(favorite.id)
    setEditingName(favorite.name)
    setEditingNotes(favorite.notes || '')
  }

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      updateFavorite(id, {
        name: editingName.trim(),
        notes: editingNotes.trim() || undefined
      })
      setEditingId(null)
      setEditingName('')
      setEditingNotes('')
      loadFavorites()
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingNotes('')
  }

  const handleViewOnMap = (favorite: Favorite) => {
    navigate(`/#map=15/${favorite.coordinates.lat.toFixed(5)}/${favorite.coordinates.lng.toFixed(5)}`)
  }

  const handleExport = async () => {
    try {
      const geojson = exportFavoritesToGeoJSON()
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

      if (isTauri) {
        // Use Tauri file dialog
        const filePath = await save({
          defaultPath: `favorites-${Date.now()}.mappa`,
          filters: [{
            name: 'Mappa Favorites',
            extensions: ['mappa', 'geojson', 'json']
          }]
        })

        if (filePath) {
          await writeTextFile(filePath, geojson)
          alert(t('favoritesExported'))
        }
      } else {
        // Use browser download
        const blob = new Blob([geojson], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `favorites-${Date.now()}.mappa`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        alert(t('favoritesExported'))
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(t('favoritesExportError'))
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const result = importFavoritesFromGeoJSON(content)

      if (result.success) {
        if (result.count === 0 && result.error) {
          // Show the duplicate message
          alert(result.error)
        } else {
          alert(t('favoritesImported').replace('{count}', result.count.toString()))
        }
        loadFavorites()
      } else {
        alert(result.error || t('favoritesImportError'))
      }
    } catch (error) {
      console.error('Import error:', error)
      alert(t('favoritesImportError'))
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClearAll = async () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

    let confirmed = false
    if (isTauri) {
      confirmed = await tauriConfirm(t('clearAllFavoritesConfirm'), {
        title: t('clearAllFavorites'),
        kind: 'warning'
      })
    } else {
      confirmed = window.confirm(t('clearAllFavoritesConfirm'))
    }

    if (confirmed) {
      clearAllFavorites()
      loadFavorites()
      alert(t('allFavoritesCleared'))
    }
  }

  return (
    <div className="p-6 pb-20">
      <h1 className="text-2xl font-bold mb-4">{t('favorites')}</h1>

      {/* Description */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">{t('favoritesDescription')}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          {t('addFavorite')}
        </button>
        <button
          onClick={handleExport}
          disabled={favorites.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {t('exportFavorites')}
        </button>
        <button
          onClick={handleImportClick}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
        >
          {t('importFavorites')}
        </button>
        <button
          onClick={handleToggleShowFavorites}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            showFavorites
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          {showFavorites ? t('hideFavorites') : t('showFavorites')}
        </button>
        <button
          onClick={handleClearAll}
          disabled={favorites.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {t('clearAllFavorites')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mappa,.geojson,.json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Add favorite dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('addFavorite')}</h2>
            <div className="space-y-4">
              {/* Name input - first field */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('favoriteName')}</label>
                <input
                  type="text"
                  value={newFavName}
                  onChange={(e) => setNewFavName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('favoriteNamePlaceholder')}
                />
              </div>

              {/* Notes input */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newFavNotes}
                  onChange={(e) => setNewFavNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add any notes about this location..."
                  rows={3}
                />
              </div>

              {/* Map container */}
              <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>

              <p className="text-sm text-gray-600">
                Click on the map to place a pin. The pin can be dragged to adjust the location.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddDialog(false)
                    setNewFavName('')
                    setNewFavNotes('')
                    setNewFavLat('')
                    setNewFavLng('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddFavorite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{t('noFavorites')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingId === favorite.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded-md mb-2"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) handleSaveEdit(favorite.id)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                      />
                      <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded-md mb-2"
                        placeholder="Add notes..."
                        rows={2}
                      />
                    </>
                  ) : (
                    <>
                      <h3
                        className="font-semibold text-lg mb-1 text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                        onClick={() => handleViewOnMap(favorite)}
                      >
                        {favorite.name}
                      </h3>
                      {favorite.notes && (
                        <p className="text-sm text-gray-700 mb-1">{favorite.notes}</p>
                      )}
                    </>
                  )}
                  <p className="text-sm text-gray-600">
                    {favorite.coordinates.lat.toFixed(6)}, {favorite.coordinates.lng.toFixed(6)}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {editingId === favorite.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(favorite.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title={t('save')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title={t('cancel')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(favorite)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title={t('edit')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title={t('delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Favorites
