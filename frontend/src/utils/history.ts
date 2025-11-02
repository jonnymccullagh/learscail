export interface HistoryItem {
  name?: string
  nameGa?: string
  nameEn?: string
  coordinates?: { lat: number; lng: number }
  timestamp: number
}

const HISTORY_KEY = 'mappa_place_history'
const MAX_HISTORY_ITEMS = 20

export function getHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading history:', error)
    return []
  }
}

export function addToHistory(item: Omit<HistoryItem, 'timestamp'>): void {
  try {
    const history = getHistory()

    // Create new history item with timestamp
    const newItem: HistoryItem = {
      ...item,
      timestamp: Date.now()
    }

    // Check if this location is already in history (same coordinates)
    const existingIndex = history.findIndex(
      h => h.coordinates?.lat === item.coordinates?.lat &&
           h.coordinates?.lng === item.coordinates?.lng
    )

    // If exists, remove it (we'll add it to the front)
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1)
    }

    // Add to front of array
    history.unshift(newItem)

    // Keep only last 20 items
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)

    // Save to localStorage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory))
  } catch (error) {
    console.error('Error saving to history:', error)
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('Error clearing history:', error)
  }
}
