import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getHistory, clearHistory, type HistoryItem } from '../../utils/history'

function History() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleClearHistory = () => {
    if (confirm(t('clearHistoryConfirm'))) {
      clearHistory()
      setHistory([])
    }
  }

  const formatValue = (value: string) => {
    return String(value).replace(/_/g, ' ')
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('daysAgo', { count: diffDays })

    return date.toLocaleDateString()
  }

  const handleSelectPlace = (item: HistoryItem) => {
    if (item.coordinates) {
      // Navigate back to map with coordinates in URL hash
      const zoom = 14
      const lat = Number(item.coordinates.lat).toFixed(5)
      const lng = Number(item.coordinates.lng).toFixed(5)
      navigate(`/#map=${zoom}/${lat}/${lng}`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('history')}</h1>

      {/* Clear History Button */}
      {history.length > 0 && (
        <button
          onClick={handleClearHistory}
          className="mb-6 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-sm font-medium"
        >
          {t('clearHistory')}
        </button>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">{t('noHistory')}</p>
      ) : (
        <div className="space-y-3">
          {history.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSelectPlace(item)}
              className="w-full text-left p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-800">
                {formatValue(item.nameGa || item.nameEn || item.name || t('unknownPlace'))}
              </div>
              {item.nameGa && item.nameEn && (
                <div className="text-sm text-gray-600 mt-1">
                  {formatValue(item.nameEn)}
                </div>
              )}
              {item.coordinates && (
                <div className="text-xs text-gray-500 mt-1">
                  {Number(item.coordinates.lat).toFixed(5)}, {Number(item.coordinates.lng).toFixed(5)}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-2">
                {formatTimestamp(item.timestamp)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default History
