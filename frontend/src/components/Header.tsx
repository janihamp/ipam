import { useMsal } from '@azure/msal-react'
import { RefreshMode } from '../types'
import { format } from 'date-fns'
import { useState } from 'react'
import { RefreshCw, Sun, Moon, HelpCircle, LogOut, Network } from 'lucide-react'

interface HeaderProps {
  refreshMode: RefreshMode
  setRefreshMode: (mode: RefreshMode) => void
  lastRefresh: Date
  onRefresh: () => void
  darkMode: boolean
  setDarkMode: (mode: boolean) => void
  onOpenAbout: () => void
}

export default function Header({ 
  refreshMode, 
  setRefreshMode, 
  lastRefresh, 
  onRefresh, 
  darkMode, 
  setDarkMode,
  onOpenAbout 
}: HeaderProps) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [showEmail, setShowEmail] = useState(false)

  const handleLogout = () => {
    instance.logoutRedirect()
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-azure-500 to-azure-600 rounded-xl flex items-center justify-center shadow-lg shadow-azure-500/25">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Azure IPAM</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">IP Address Management Dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Refresh Mode Selector */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setRefreshMode('manual')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              refreshMode === 'manual' 
                ? 'bg-white dark:bg-gray-600 text-azure-600 dark:text-azure-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setRefreshMode('auto')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              refreshMode === 'auto' 
                ? 'bg-white dark:bg-gray-600 text-azure-600 dark:text-azure-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Auto (5m)
          </button>
          <button
            onClick={() => setRefreshMode('realtime')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              refreshMode === 'realtime' 
                ? 'bg-white dark:bg-gray-600 text-azure-600 dark:text-azure-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${refreshMode === 'realtime' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              Real-time
            </span>
          </button>
        </div>

        {/* Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-azure-500 to-azure-600 text-white rounded-lg hover:from-azure-600 hover:to-azure-700 transition-all shadow-md shadow-azure-500/25"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last: {format(lastRefresh, 'HH:mm:ss')}
          </span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* About Button */}
        <button
          onClick={onOpenAbout}
          className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="About Azure IPAM"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-4">
          <div 
            className="text-right relative"
            onMouseEnter={() => setShowEmail(true)}
            onMouseLeave={() => setShowEmail(false)}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
              {account?.name || 'User'}
            </p>
            {showEmail && account?.username && (
              <div className="absolute right-0 top-full mt-1 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
                {account.username}
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
