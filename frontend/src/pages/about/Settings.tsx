import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { clearHistory } from '../../utils/history'
import { getHomeLocation, clearHomeLocation, HomeLocation } from '../../utils/homeLocation'
import { MAP_STYLES, getMapStyle, saveMapStyle, type MapStyleId } from '../../utils/mapStyle'
import { getShowFavorites, setShowFavorites as saveShowFavorites } from '../../utils/favorites'

function Settings() {
  const { t } = useTranslation()
  const { language, changeLanguage } = useLanguage()
  const navigate = useNavigate()
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyleId>(getMapStyle())
  const [showFavorites, setShowFavorites] = useState(getShowFavorites())

  useEffect(() => {
    setHomeLocation(getHomeLocation())
  }, [])

  const handleChangeMapStyle = (styleId: MapStyleId) => {
    setMapStyle(styleId)
    saveMapStyle(styleId)
    // Trigger a custom event to notify Map components to update
    window.dispatchEvent(new CustomEvent('mapStyleChanged', { detail: styleId }))
  }

  const handleToggleShowFavorites = () => {
    const newValue = !showFavorites
    setShowFavorites(newValue)
    saveShowFavorites(newValue)
    window.dispatchEvent(new CustomEvent('showFavoritesChanged', { detail: newValue }))
  }

  const handleClearHistory = () => {
    if (confirm(t('clearHistoryConfirm'))) {
      clearHistory()
      alert(t('historyCleared'))
    }
  }

  const handleClearHomeLocation = () => {
    clearHomeLocation()
    setHomeLocation(null)
  }

  const handleViewHomeOnMap = () => {
    if (homeLocation) {
      navigate(`/?lat=${homeLocation.coordinates.lat}&lng=${homeLocation.coordinates.lng}&zoom=15`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('settings')}</h1>

      {/* Language Settings */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{t('language')}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => changeLanguage('en')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              language === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('english')}
          </button>
          <button
            onClick={() => changeLanguage('ga')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              language === 'ga'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('irish')}
          </button>
        </div>
      </div>

      {/* Map Style Settings */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{t('mapStyle')}</h2>
        <div className="space-y-3">
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => handleChangeMapStyle(style.id)}
              className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                mapStyle === style.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">
                {language === 'ga' ? style.nameGa : style.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Show Favorites */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{t('showFavorites')}</h2>
        <button
          onClick={handleToggleShowFavorites}
          className="w-full flex items-center justify-between p-4 border-2 rounded-lg transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          <span className="font-medium">{showFavorites ? t('hideFavorites') : t('showFavorites')}</span>
          <div className={`w-12 h-6 rounded-full transition-colors ${showFavorites ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${showFavorites ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'}`}></div>
          </div>
        </button>
      </div>

      {/* Home Location */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{t('homeLocation')}</h2>
        {homeLocation && homeLocation.coordinates ? (
          <div className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">{t('homeLocationSet')}</p>
              <button
                onClick={handleViewHomeOnMap}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {homeLocation.coordinates.lat.toFixed(6)}, {homeLocation.coordinates.lng.toFixed(6)}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleViewHomeOnMap}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-sm font-medium"
              >
                {t('viewOnMap')}
              </button>
              <button
                onClick={handleClearHomeLocation}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-sm font-medium"
              >
                {t('clearHomeLocation')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-gray-600">{t('homeLocationNotSet')}</p>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Data</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium">{t('clearHistory')}</h3>
              <p className="text-sm text-gray-600">Remove all visited places from history</p>
            </div>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-sm font-medium"
            >
              {t('clearHistory')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
