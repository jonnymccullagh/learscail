import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { queryLogainm, formatLogainmResult, type LogainmInfo } from '../utils/logainm'
import { queryGeograph, type GeographResponse } from '../utils/geograph'
import { queryWikipedia, type WikipediaSummary } from '../utils/wikipedia'
import { querySraid, type SraidAudioResult } from '../utils/sraid'
import { addToHistory, getHistory, type HistoryItem } from '../utils/history'
import { saveDirectionsData, getDirectionsData } from '../utils/directionsStorage'

interface DetailPanelProps {
  isOpen: boolean
  onClose: () => void
  feature: {
    name?: string
    nameGa?: string
    nameEn?: string
    coordinates?: { lat: number; lng: number }
    properties?: any
  } | null
}

function DetailPanel({ isOpen, onClose, feature }: DetailPanelProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [logainmInfo, setLogainmInfo] = useState<LogainmInfo | null>(null)
  const [geographImages, setGeographImages] = useState<GeographResponse | null>(null)
  const [wikipediaSummary, setWikipediaSummary] = useState<WikipediaSummary | null>(null)
  const [sraidAudio, setSraidAudio] = useState<SraidAudioResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGeograph, setIsLoadingGeograph] = useState(false)
  const [isLoadingWikipedia, setIsLoadingWikipedia] = useState(false)
  const [isLoadingSraid, setIsLoadingSraid] = useState(false)
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    if (isOpen && feature) {
      // Add to history when detail panel opens
      addToHistory({
        name: feature.name,
        nameGa: feature.nameGa,
        nameEn: feature.nameEn,
        coordinates: feature.coordinates
      })

      // Update recent history state (exclude current item)
      const history = getHistory()
      const currentCoords = feature.coordinates
      const otherHistory = history.filter(
        item => !(item.coordinates?.lat === currentCoords?.lat &&
                  item.coordinates?.lng === currentCoords?.lng)
      )
      setRecentHistory(otherHistory.slice(0, 3))

      setIsLoading(true)
      setIsLoadingGeograph(true)
      setIsLoadingWikipedia(true)
      setIsLoadingSraid(true)
      setLogainmInfo(null)
      setGeographImages(null)
      setWikipediaSummary(null)
      setSraidAudio(null)

      const locationName = feature.nameGa || feature.nameEn || feature.name

      // Query Logainm
      if (locationName && feature.coordinates) {
        queryLogainm(
          locationName,
          feature.coordinates.lat,
          feature.coordinates.lng
        ).then(result => {
          if (result) {
            setLogainmInfo(formatLogainmResult(result))
          }
          setIsLoading(false)
        }).catch(() => {
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }

      // Query Geograph for images near the location
      if (feature.coordinates) {
        queryGeograph(
          feature.coordinates.lat,
          feature.coordinates.lng,
          1 // 1km distance
        ).then(result => {
          if (result) {
            setGeographImages(result)
          }
          setIsLoadingGeograph(false)
        }).catch(() => {
          setIsLoadingGeograph(false)
        })
      } else {
        setIsLoadingGeograph(false)
      }

      // Query Wikipedia based on selected language
      const pageName = language === 'ga' ? feature.nameGa : (feature.nameEn || feature.name)
      console.log('DetailPanel Wikipedia query:', { pageName, language, feature });
      if (pageName) {
        queryWikipedia(pageName, language as 'en' | 'ga')
          .then(result => {
            console.log('Wikipedia result:', result);
            if (result) {
              setWikipediaSummary(result)
            }
            setIsLoadingWikipedia(false)
          }).catch((err) => {
            console.error('Wikipedia query error:', err);
            setIsLoadingWikipedia(false)
          })
      } else {
        console.log('No page name for Wikipedia');
        setIsLoadingWikipedia(false)
      }

      // Query Sraid for pronunciation audio (always use English name)
      const englishName = feature.nameEn || feature.name
      if (englishName) {
        querySraid(englishName)
          .then(result => {
            console.log('Sraid result:', result);
            if (result && (result.irish?.count || result.english?.count)) {
              setSraidAudio(result)
            }
            setIsLoadingSraid(false)
          }).catch((err) => {
            console.error('Sraid query error:', err);
            setIsLoadingSraid(false)
          })
      } else {
        setIsLoadingSraid(false)
      }
    }
  }, [isOpen, feature, language])

  if (!feature) return null

  const formatValue = (value: string) => {
    return String(value).replace(/_/g, ' ')
  }

  const handleGetDirections = () => {
    if (!feature.coordinates) return

    // Get existing directions data or create new
    const existingData = getDirectionsData()

    // Save current location as start location
    const displayName = feature.nameGa || feature.nameEn || feature.name || 'Unknown location'

    saveDirectionsData({
      startPoint: { lat: feature.coordinates.lat, lng: feature.coordinates.lng },
      endPoint: existingData?.endPoint || null,
      startName: displayName,
      endName: existingData?.endName || '',
      route: null,
      profile: existingData?.profile || 'car'
    })

    // Navigate to directions page
    navigate('/about/directions')
    onClose()
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
        className={`fixed top-0 left-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {feature.nameGa || feature.nameEn || feature.name || 'Place Details'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* OSM Names */}
          <div className="mb-6">
            <div className="space-y-2">
              {feature.nameGa && (
                <div>
                  <span className="text-xs text-gray-500">{t('irish')}:</span>
                  <p className="text-lg font-medium">{formatValue(feature.nameGa)}</p>
                </div>
              )}
              {(feature.nameEn || feature.name) && (
                <div>
                  <span className="text-xs text-gray-500">{t('english')}:</span>
                  <p className="text-base text-gray-700">{formatValue(feature.nameEn || feature.name || '')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Logainm Information - only show if loading or has pronunciation/etymology */}
          {(isLoading || (logainmInfo && ((logainmInfo.gaAudio || logainmInfo.enAudio) || (logainmInfo.glossary && logainmInfo.glossary.length > 0)))) && (
            <>
              <div className="border-t border-gray-200 my-6"></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Logainm.ie</h3>

                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {!isLoading && logainmInfo && (
                  <div className="space-y-4">
                    {/* Audio */}
                    {(logainmInfo.gaAudio || logainmInfo.enAudio) && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">{t('pronunciation')}:</span>
                        <div className="space-y-2">
                          {logainmInfo.gaAudio && (
                            <button
                              onClick={() => {
                                const audio = new Audio(logainmInfo.gaAudio!)
                                audio.play().catch(err => {
                                  console.error('Error playing audio:', err)
                                  alert('Unable to play audio.')
                                })
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 text-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              {t('pronunciationIrish')}
                            </button>
                          )}
                          {logainmInfo.enAudio && (
                            <button
                              onClick={() => {
                                const audio = new Audio(logainmInfo.enAudio!)
                                audio.play().catch(err => {
                                  console.error('Error playing audio:', err)
                                  alert('Unable to play audio.')
                                })
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 text-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              {t('pronunciationEnglish')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Etymology/Glossary */}
                    {logainmInfo.glossary && logainmInfo.glossary.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">{t('etymology')}:</span>
                        <div className="bg-gray-50 rounded-md p-3 space-y-2">
                          {logainmInfo.glossary.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <em className="font-medium">{item.headword}</em>
                              <span className="text-gray-600"> - {item.translation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sraid Pronunciation Audio */}
          {(isLoadingSraid || (sraidAudio && (sraidAudio.irish?.count || sraidAudio.english?.count))) && (
            <>
              <div className="border-t border-gray-200 my-6"></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Sraid.redbranch.net</h3>

                {isLoadingSraid && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {!isLoadingSraid && sraidAudio && (
                  <div className="space-y-4">
                    {(sraidAudio.irish?.count || sraidAudio.english?.count) && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">{t('pronunciation')}:</span>
                        <div className="space-y-2">
                          {sraidAudio.irish && sraidAudio.irish.count > 0 && sraidAudio.irish.locations[0] && (
                            <button
                              onClick={() => {
                                const audioPath = sraidAudio.irish!.locations[0].path
                                const audio = new Audio(audioPath)
                                audio.play().catch(err => {
                                  console.error('Error playing Sraid audio:', err)
                                  alert('Unable to play audio.')
                                })
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-md text-green-700 text-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              {t('pronunciationIrish')}
                            </button>
                          )}
                          {sraidAudio.english && sraidAudio.english.count > 0 && sraidAudio.english.locations[0] && (
                            <button
                              onClick={() => {
                                const audioPath = sraidAudio.english!.locations[0].path
                                const audio = new Audio(audioPath)
                                audio.play().catch(err => {
                                  console.error('Error playing Sraid audio:', err)
                                  alert('Unable to play audio.')
                                })
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-md text-green-700 text-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              {t('pronunciationEnglish')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Wikipedia Summary - only show if loading or has content */}
          {(isLoadingWikipedia || wikipediaSummary) && (
            <>
              <div className="border-t border-gray-200 my-6"></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Wikipedia</h3>

                {isLoadingWikipedia && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {!isLoadingWikipedia && wikipediaSummary && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">{wikipediaSummary.extract}</p>
                    {wikipediaSummary.content_urls?.desktop?.page && (
                      <a
                        href={wikipediaSummary.content_urls.desktop.page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {t('readMoreOnWikipedia')}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Geograph Images */}
          <div className="border-t border-gray-200 my-6"></div>
          <div>
            {isLoadingGeograph && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!isLoadingGeograph && !geographImages && (
              <p className="text-sm text-gray-500 italic">{t('noImagesFoundZoom')}</p>
            )}

            {!isLoadingGeograph && geographImages && geographImages.items.length > 0 && (
              <div className="space-y-4">
                {geographImages.items.slice(0, 1).map((image) => {
                  // Extract the base URL by removing the filename
                  // e.g., https://s1.geograph.org.uk/geophotos/07/78/55/7785509_8018f525_120x120.jpg
                  // becomes https://s1.geograph.org.uk/geophotos/07/78/55/7785509_8018f525.jpg
                  const lastSlash = image.thumb.lastIndexOf('/')
                  const baseUrl = image.thumb.substring(0, lastSlash + 1)
                  const filename = image.thumb.substring(lastSlash + 1)
                  // Remove the _120x120 size suffix from the filename
                  const largeFilename = filename.replace('_120x120', '')
                  const mediumImage = baseUrl + largeFilename

                  // Remove the ID prefix from title (everything up to and including ': ')
                  const cleanTitle = image.title.includes(' : ')
                    ? image.title.substring(image.title.indexOf(' : ') + 3)
                    : image.title

                  return (
                    <div key={image.guid} className="border border-gray-200 rounded-md overflow-hidden">
                      {/* Image */}
                      <a href={image.link} target="_blank" rel="noopener noreferrer">
                        <img
                          src={mediumImage}
                          alt={image.title}
                          className="w-full object-cover hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </a>

                      {/* Image Info */}
                      <div className="p-3">
                        <h4 className="font-semibold text-sm mb-1">
                          {cleanTitle}
                        </h4>
                        {image.description && (
                          <p className="text-xs text-gray-600 mb-2">{image.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>by {image.author}</span>
                          {image.imageTaken && <span>{image.imageTaken}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          <a
                            href={image.licence}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gray-600"
                          >
                            CC BY-SA 2.0
                          </a>
                          <span> · source geograph.ie</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Get Directions Button */}
          {feature.coordinates && (
            <>
              <div className="border-t border-gray-200 my-6"></div>
              <button
                onClick={handleGetDirections}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {t('getDirections')}
              </button>
            </>
          )}

          {/* Recently Viewed */}
          {recentHistory.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-6"></div>
              <div>
                <h3 className="text-lg font-semibold mb-3">{t('recentlyViewed')}</h3>
                <div className="space-y-2">
                  {recentHistory.map((item, index) => {
                    const displayName = item.nameGa || item.nameEn || item.name || t('unknownPlace')
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (item.coordinates) {
                            const zoom = 14
                            const lat = item.coordinates.lat.toFixed(5)
                            const lng = item.coordinates.lng.toFixed(5)
                            navigate(`/#map=${zoom}/${lat}/${lng}`)
                            onClose()
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm"
                      >
                        <div className="font-medium text-gray-900">{displayName}</div>
                        {item.nameGa && item.nameEn && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.nameGa === displayName ? item.nameEn : item.nameGa}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Bottom spacing for navigation bar */}
          <div className="pb-20"></div>
        </div>
      </div>
    </>
  )
}

export default DetailPanel
