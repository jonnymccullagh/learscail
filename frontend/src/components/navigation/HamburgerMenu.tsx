import { useState, createContext, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Create context for menu state
const MenuContext = createContext<{
  isPinned: boolean
  setIsPinned: (pinned: boolean) => void
}>({
  isPinned: false,
  setIsPinned: () => {}
})

export function useMenu() {
  return useContext(MenuContext)
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinned] = useState(false)

  return (
    <MenuContext.Provider value={{ isPinned, setIsPinned }}>
      {children}
    </MenuContext.Provider>
  )
}

function HamburgerMenu() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const { isPinned, setIsPinned } = useMenu()
  const location = useLocation()

  const mainItems = [
    { path: '/', labelKey: 'map', bold: true },
  ]

  const aboutItems = [
    { path: '/about/history', labelKey: 'history' },
    { path: '/about/favorites', labelKey: 'favorites' },
    { path: '/about/directions', labelKey: 'directions' },
    { path: '/about/settings', labelKey: 'settings' },
    { path: '/about', labelKey: 'about', bold: false },
  ]

  const togglePin = () => {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    if (newPinned) {
      setIsOpen(true)
    }
  }

  const handleLinkClick = () => {
    if (!isPinned) {
      setIsOpen(false)
    }
  }

  const handleOverlayClick = () => {
    if (!isPinned) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Hamburger Button - always visible when menu is not pinned */}
      {!isPinned && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-2 right-2 z-50 p-2 bg-white rounded-md shadow-lg hover:bg-gray-100"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      )}

      {/* Sidebar Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen || isPinned ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="pt-8 px-4">
          {/* Pin/Unpin button */}
          <div className="flex justify-end items-center mb-4">
            <button
              onClick={togglePin}
              className="p-1.5 rounded hover:bg-gray-100"
              title={isPinned ? 'Unpin menu' : 'Pin menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isPinned ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                )}
              </svg>
            </button>
          </div>
          <nav>
            {/* Main navigation items */}
            <ul className="space-y-2 mb-6">
              {mainItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`block px-4 py-3 rounded-lg transition-colors ${item.bold ? 'font-semibold' : ''} ${
                      location.pathname === item.path
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* About submenu items */}
            <ul className="space-y-2">
              {aboutItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`block px-4 py-3 rounded-lg transition-colors ${item.bold ? 'font-semibold' : ''} ${
                      location.pathname === item.path
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Overlay - shown when menu is open but not pinned */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={handleOverlayClick}
        />
      )}
    </>
  )
}

export default HamburgerMenu
