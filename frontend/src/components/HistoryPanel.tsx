import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getHistory, clearHistory, type HistoryItem } from '../utils/history'

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlace: (item: HistoryItem) => void
}

function HistoryPanel({ isOpen, onClose, onSelectPlace }: HistoryPanelProps) {
  const { t } = useTranslation()
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory())
    }
  }, [isOpen])

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

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('history')}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label={t('close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Clear History Button */}
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="w-full mb-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-sm font-medium"
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
                  onClick={() => {
                    onSelectPlace(item)
                    onClose()
                  }}
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
                      {item.coordinates.lat.toFixed(5)}, {item.coordinates.lng.toFixed(5)}
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
      </div>
    </>
  )
}

export default HistoryPanel
