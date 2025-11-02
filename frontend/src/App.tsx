  import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
  import Map from './components/Map'
  import BottomNav from './components/navigation/BottomNav'
  import HamburgerMenu, { MenuProvider, useMenu } from './components/navigation/HamburgerMenu'
  import About from './pages/about/About'
  import History from './pages/about/History'
  import Directions from './pages/about/Directions'
  import Settings from './pages/about/Settings'
  import Favorites from './pages/about/Favorites'
  import { LanguageProvider } from './contexts/LanguageContext'

  function Home() {
    const { isPinned } = useMenu()

    return (
      <div className={`absolute inset-0 bottom-16 transition-all duration-300 ${isPinned ? 'right-64' : 'right-0'}`}>
        <Map className="w-full h-full" />
      </div>
    )
  }

  function AboutLayout({ children }: { children: React.ReactNode }) {
    const { isPinned } = useMenu()

    return (
      <div className={`pb-16 h-screen overflow-y-auto transition-all duration-300 ${isPinned ? 'mr-64' : 'mr-0'}`}>
        {children}
      </div>
    )
  }

  function AppContent() {
    const { isPinned } = useMenu()

    return (
      <div className="h-screen w-screen overflow-hidden">
        <HamburgerMenu />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about/history" element={<AboutLayout><History /></AboutLayout>} />
          <Route path="/about/favorites" element={<AboutLayout><Favorites /></AboutLayout>} />
          <Route path="/about/directions" element={<AboutLayout><Directions /></AboutLayout>} />
          <Route path="/about/settings" element={<AboutLayout><Settings /></AboutLayout>} />
          <Route path="/about" element={<AboutLayout><About /></AboutLayout>} />
        </Routes>

        <BottomNav isPinned={isPinned} />
      </div>
    )
  }

  function App() {
    return (
      <Router>
        <LanguageProvider>
          <MenuProvider>
            <AppContent />
          </MenuProvider>
        </LanguageProvider>
      </Router>
    )
  }

  export default App