import { FilterState, Subscription, QuickStats } from '../types'
import { Search } from 'lucide-react'

interface SidebarProps {
  filterState: FilterState
  setFilterState: (state: FilterState) => void
  subscriptions: Subscription[]
  quickStats?: QuickStats
}

export default function Sidebar({ filterState, setFilterState, subscriptions, quickStats }: SidebarProps) {
  const handleSubscriptionToggle = (subId: string) => {
    const newSubs = filterState.subscriptions.includes(subId)
      ? filterState.subscriptions.filter(s => s !== subId)
      : [...filterState.subscriptions, subId]
    setFilterState({ ...filterState, subscriptions: newSubs })
  }

  const handleSelectAll = () => {
    setFilterState({ 
      ...filterState, 
      subscriptions: subscriptions.map(s => s.id) 
    })
  }

  const handleClearAll = () => {
    setFilterState({ ...filterState, subscriptions: [] })
  }

  return (
    <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)] p-4">
      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search IPs, resources..."
            value={filterState.searchQuery}
            onChange={(e) => setFilterState({ ...filterState, searchQuery: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-azure-500 focus:border-azure-500"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* IP Type Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IP Type</label>
        <div className="flex gap-1">
          {(['all', 'public', 'private'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterState({ ...filterState, ipType: type })}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filterState.ipType === type
                  ? 'bg-azure-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Allocation Method Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Allocation</label>
        <div className="flex gap-1">
          {(['all', 'static', 'dynamic'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setFilterState({ ...filterState, allocationMethod: method })}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filterState.allocationMethod === method
                  ? 'bg-azure-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {method.charAt(0).toUpperCase() + method.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscriptions</label>
          <div className="flex gap-2 text-xs">
            <button 
              onClick={handleSelectAll}
              className="text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300"
            >
              All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button 
              onClick={handleClearAll}
              className="text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300"
            >
              None
            </button>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
          {subscriptions.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              Loading subscriptions...
            </div>
          ) : (
            subscriptions.map((sub) => (
              <label
                key={sub.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b dark:border-gray-600 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={filterState.subscriptions.includes(sub.id)}
                  onChange={() => handleSubscriptionToggle(sub.id)}
                  className="rounded border-gray-300 dark:border-gray-500 text-azure-500 focus:ring-azure-500 bg-white dark:bg-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={sub.name}>
                  {sub.name}
                </span>
              </label>
            ))
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {filterState.subscriptions.length === 0 
            ? 'Showing all subscriptions' 
            : `${filterState.subscriptions.length} selected`}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total IPs</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {quickStats ? quickStats.totalIPs.toLocaleString() : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Subnets</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {quickStats ? quickStats.subnets.toLocaleString() : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Conflicts</span>
            <span className={`text-sm font-semibold ${
              quickStats && quickStats.conflicts > 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {quickStats ? quickStats.conflicts : '-'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
