import { IPAMEvent } from '../../types'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { 
  List, 
  Grid, 
  Globe, 
  Link2, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react'

interface EventsTabProps {
  events: IPAMEvent[]
}

type EventCategory = 'all' | 'subnet' | 'publicIP' | 'vnet' | 'conflict' | 'exhaustion' | 'quota'

export default function EventsTab({ events }: EventsTabProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set(['all']))
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')

  const categories: { id: EventCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Events', icon: <List className="w-4 h-4" /> },
    { id: 'subnet', label: 'Subnet Changes', icon: <Grid className="w-4 h-4" /> },
    { id: 'publicIP', label: 'Public IPs', icon: <Globe className="w-4 h-4" /> },
    { id: 'vnet', label: 'VNet Changes', icon: <Link2 className="w-4 h-4" /> },
    { id: 'conflict', label: 'Conflicts', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'exhaustion', label: 'Exhaustion', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'quota', label: 'Quota Alerts', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  const toggleCategory = (cat: EventCategory) => {
    const newCats = new Set(selectedCategories)
    if (cat === 'all') {
      newCats.clear()
      newCats.add('all')
    } else {
      newCats.delete('all')
      if (newCats.has(cat)) {
        newCats.delete(cat)
      } else {
        newCats.add(cat)
      }
      if (newCats.size === 0) {
        newCats.add('all')
      }
    }
    setSelectedCategories(newCats)
  }

  const filteredEvents = events.filter(event => {
    if (selectedCategories.has('all')) return true
    return selectedCategories.has(event.category as EventCategory)
  })

  const getEventIcon = (eventType: string, category: string) => {
    if (category === 'conflict') return <AlertTriangle className="w-5 h-5 text-amber-500" />
    if (category === 'exhaustion') return <AlertCircle className="w-5 h-5 text-red-500" />
    if (category === 'quota') return <BarChart3 className="w-5 h-5 text-purple-500" />
    
    switch (eventType) {
      case 'create': return <Plus className="w-5 h-5 text-green-500" />
      case 'update': return <Pencil className="w-5 h-5 text-blue-500" />
      case 'delete': return <Trash2 className="w-5 h-5 text-red-500" />
      case 'alert': return <Bell className="w-5 h-5 text-amber-500" />
      default: return <List className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle className="w-3 h-3" /> OK
          </span>
        )
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        )
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" /> WARN
          </span>
        )
      default:
        return null
    }
  }

  const openInAzurePortal = (resourceId: string) => {
    const portalUrl = `https://portal.azure.com/#@/resource${resourceId}`
    window.open(portalUrl, '_blank')
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Activity logs for network resource changes
          </p>
        </div>
        <div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategories.has(cat.id)
                ? 'bg-azure-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Event Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {format(parseISO(event.timestamp), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getEventIcon(event.eventType, event.category)}
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {event.category.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{event.eventType}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{event.resourceName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{event.resourceType}</div>
                  {event.details && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">→ {event.details}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {event.caller}
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(event.status)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openInAzurePortal(event.resourceId)}
                    className="flex items-center gap-1 text-azure-600 hover:text-azure-800 dark:text-azure-400 dark:hover:text-azure-300 text-sm"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No events found for the selected filters
          </div>
        )}
      </div>
    </div>
  )
}
