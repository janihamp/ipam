import { useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import AboutModal from './components/AboutModal'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import { FilterState, RefreshMode, Subscription, QuickStats } from './types'

function App() {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()
  
  const [filterState, setFilterState] = useState<FilterState>({
    subscriptions: [],
    resourceGroups: [],
    ipType: 'all',
    allocationMethod: 'all',
    searchQuery: '',
  })
  
  const [refreshMode, setRefreshMode] = useState<RefreshMode>('manual')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [quickStats, setQuickStats] = useState<QuickStats | undefined>(undefined)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [showAbout, setShowAbout] = useState(false)

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  // Listen for about modal event from footer
  useEffect(() => {
    const handleOpenAbout = () => setShowAbout(true)
    window.addEventListener('open-about', handleOpenAbout)
    return () => window.removeEventListener('open-about', handleOpenAbout)
  }, [])

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date())
  }, [])

  if (inProgress !== InteractionStatus.None) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azure-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <Header
        refreshMode={refreshMode}
        setRefreshMode={setRefreshMode}
        lastRefresh={lastRefresh}
        onRefresh={handleRefresh}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAbout={() => setShowAbout(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          filterState={filterState}
          setFilterState={setFilterState}
          subscriptions={subscriptions}
          quickStats={quickStats}
        />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard
                  filterState={filterState}
                  refreshMode={refreshMode}
                  lastRefresh={lastRefresh}
                  onSubscriptionsLoaded={setSubscriptions}
                  onStatsLoaded={setQuickStats}
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
      
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}

export default App
