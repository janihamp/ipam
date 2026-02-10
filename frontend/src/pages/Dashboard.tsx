import { useState, useEffect, useMemo } from 'react'
import { FilterState, RefreshMode, Subscription, IPAddress, Subnet, CIDRConflict, IPAMEvent, OrphanResource, QuickStats, IPAMPool } from '../types'
import DashboardTab from '../components/tabs/DashboardTab'
import IPAddressesTab from '../components/tabs/IPAddressesTab'
import SubnetsTab from '../components/tabs/SubnetsTab'
import ConflictsTab from '../components/tabs/ConflictsTab'
import EventsTab from '../components/tabs/EventsTab'
import OrphanResourcesTab from '../components/tabs/OrphanResourcesTab'
import IPAMPoolsTab from '../components/tabs/IPAMPoolsTab'
import { apiService } from '../services/api'
import { 
  Globe, 
  Cloud, 
  Network, 
  Layout, 
  AlertTriangle, 
  Trash2,
  List,
  Grid,
  Activity,
  Archive,
  LayoutDashboard,
  Database
} from 'lucide-react'

interface DashboardProps {
  filterState: FilterState
  refreshMode: RefreshMode
  lastRefresh: Date
  onSubscriptionsLoaded: (subs: Subscription[]) => void
  onStatsLoaded: (stats: QuickStats) => void
}

type TabType = 'dashboard' | 'ips' | 'subnets' | 'conflicts' | 'events' | 'orphans' | 'ipam'

export default function Dashboard({ filterState, refreshMode, lastRefresh, onSubscriptionsLoaded, onStatsLoaded }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([])
  const [subnets, setSubnets] = useState<Subnet[]>([])
  const [conflicts, setConflicts] = useState<CIDRConflict[]>([])
  const [events, setEvents] = useState<IPAMEvent[]>([])
  const [ipamPools, setIpamPools] = useState<IPAMPool[]>([])

  useEffect(() => {
    loadData()
  }, [lastRefresh])

  useEffect(() => {
    if (refreshMode === 'auto') {
      const interval = setInterval(loadData, 5 * 60 * 1000) // 5 minutes
      return () => clearInterval(interval)
    }
  }, [refreshMode])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [subsData, ipsData, subnetsData, conflictsData, eventsData, ipamData] = await Promise.all([
        apiService.getSubscriptions(),
        apiService.getIPAddresses(),
        apiService.getSubnets(),
        apiService.getConflicts(),
        apiService.getEvents(),
        apiService.getIPAMPools(),
      ])
      
      setSubscriptions(subsData)
      onSubscriptionsLoaded(subsData)
      setIPAddresses(ipsData)
      setSubnets(subnetsData)
      setConflicts(conflictsData)
      setEvents(eventsData)
      setIpamPools(ipamData)
      
      // Update quick stats for sidebar
      const totalAllocations = ipamData.reduce((sum, pool) => sum + pool.allocations.length, 0)
      onStatsLoaded({
        totalIPs: ipsData.length,
        subnets: subnetsData.length,
        conflicts: conflictsData.length,
        ipamPools: ipamData.length,
        ipamAllocations: totalAllocations,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate orphan resources
  const orphanResources = useMemo<OrphanResource[]>(() => {
    const orphans: OrphanResource[] = []
    
    // Find unassigned public IPs
    for (const ip of ipAddresses) {
      if (ip.type === 'Public' && !ip.associatedResource) {
        const sub = subscriptions.find(s => s.id === ip.subscriptionId)
        orphans.push({
          id: ip.id,
          name: ip.id.split('/').pop() || 'Unknown',
          type: 'publicIP',
          resourceGroup: ip.resourceGroup,
          subscriptionId: ip.subscriptionId,
          subscriptionName: sub?.name || ip.subscriptionId,
          location: ip.location,
          details: `${ip.allocationMethod} allocation, ${ip.sku || 'Basic'} SKU${ip.ipAddress ? `, IP: ${ip.ipAddress}` : ', No IP assigned'}`,
        })
      }
    }
    
    return orphans
  }, [ipAddresses, subscriptions])

  // Filter data based on filterState
  const filteredIPs = ipAddresses.filter(ip => {
    if (filterState.subscriptions.length > 0 && !filterState.subscriptions.includes(ip.subscriptionId)) {
      return false
    }
    if (filterState.ipType !== 'all' && ip.type.toLowerCase() !== filterState.ipType) {
      return false
    }
    if (filterState.allocationMethod !== 'all' && ip.allocationMethod.toLowerCase() !== filterState.allocationMethod) {
      return false
    }
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase()
      return (
        ip.ipAddress?.toLowerCase().includes(query) ||
        ip.associatedResource?.toLowerCase().includes(query) ||
        ip.resourceGroup?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const filteredSubnets = subnets.filter(subnet => {
    if (filterState.subscriptions.length > 0 && !filterState.subscriptions.includes(subnet.subscriptionId)) {
      return false
    }
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase()
      return (
        subnet.name?.toLowerCase().includes(query) ||
        subnet.vnetName?.toLowerCase().includes(query) ||
        subnet.addressPrefix?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const filteredIPAMPools = ipamPools.filter(pool => {
    if (filterState.subscriptions.length > 0 && !filterState.subscriptions.includes(pool.subscriptionId)) {
      return false
    }
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase()
      return (
        pool.name?.toLowerCase().includes(query) ||
        pool.description?.toLowerCase().includes(query) ||
        pool.addressPrefixes.some(prefix => prefix.includes(query))
      )
    }
    return true
  })

  // Quick stats calculations
  const quickStats = useMemo(() => {
    const publicIPs = ipAddresses.filter(ip => ip.type === 'Public')
    const privateIPs = ipAddresses.filter(ip => ip.type === 'Private')
    const assignedPublicIPs = publicIPs.filter(ip => ip.associatedResource)
    const criticalSubnets = subnets.filter(s => s.utilizationPercent >= 80)
    const warningSubnets = subnets.filter(s => s.utilizationPercent >= 50 && s.utilizationPercent < 80)
    const vnets = new Set(subnets.map(s => s.vnetId)).size
    const totalIPAMAllocations = ipamPools.reduce((sum, pool) => sum + pool.allocations.length, 0)
    const highUtilizationPools = ipamPools.filter(p => p.utilization.percentUsed >= 75).length
    
    return {
      totalIPs: ipAddresses.length,
      publicIPs: publicIPs.length,
      privateIPs: privateIPs.length,
      assignedPublicIPs: assignedPublicIPs.length,
      unassignedPublicIPs: publicIPs.length - assignedPublicIPs.length,
      totalSubnets: subnets.length,
      criticalSubnets: criticalSubnets.length,
      warningSubnets: warningSubnets.length,
      vnets,
      conflicts: conflicts.length,
      orphanResources: orphanResources.length,
      ipamPools: ipamPools.length,
      ipamAllocations: totalIPAMAllocations,
      highUtilizationPools,
    }
  }, [ipAddresses, subnets, conflicts, orphanResources, ipamPools])

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ipam' as const, label: 'IPAM Pools', icon: Database, count: filteredIPAMPools.length, highlight: true },
    { id: 'ips' as const, label: 'IP Addresses', icon: List, count: filteredIPs.length },
    { id: 'subnets' as const, label: 'Subnets', icon: Grid, count: filteredSubnets.length },
    { id: 'conflicts' as const, label: 'Conflicts', icon: AlertTriangle, count: conflicts.length, alert: conflicts.length > 0 },
    { id: 'events' as const, label: 'Events', icon: Activity, count: events.length },
    { id: 'orphans' as const, label: 'Orphan Resources', icon: Archive, count: orphanResources.length, alert: orphanResources.length > 0 },
  ]

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <div className="text-red-600 dark:text-red-400 mb-2">Error loading data</div>
        <p className="text-red-500 dark:text-red-300 text-sm">{error}</p>
        <button 
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Quick Stats - Hidden on Dashboard tab */}
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6 transition-all duration-300 ease-in-out overflow-hidden ${
        activeTab === 'dashboard' ? 'max-h-0 opacity-0 mb-0' : 'max-h-40 opacity-100'
      }`}>
        <StatCard 
          label="IPAM Pools" 
          value={loading ? '...' : quickStats.ipamPools} 
          subValue={loading ? '' : `${quickStats.ipamAllocations} allocations`}
          icon={<Database className="w-6 h-6 text-purple-500" />}
          loading={loading}
          alert={!loading && quickStats.highUtilizationPools > 0}
          onClick={() => setActiveTab('ipam')}
        />
        <StatCard 
          label="Total IPs" 
          value={loading ? '...' : quickStats.totalIPs} 
          icon={<Globe className="w-6 h-6 text-azure-500" />}
          loading={loading}
          onClick={() => setActiveTab('ips')}
        />
        <StatCard 
          label="Public IPs" 
          value={loading ? '...' : quickStats.publicIPs} 
          subValue={loading ? '' : `${quickStats.assignedPublicIPs} assigned`}
          icon={<Cloud className="w-6 h-6 text-blue-500" />}
          loading={loading}
          onClick={() => setActiveTab('ips')}
        />
        <StatCard 
          label="VNets" 
          value={loading ? '...' : quickStats.vnets} 
          icon={<Network className="w-6 h-6 text-purple-500" />}
          loading={loading}
          onClick={() => setActiveTab('subnets')}
        />
        <StatCard 
          label="Subnets" 
          value={loading ? '...' : quickStats.totalSubnets} 
          subValue={loading ? '' : `${quickStats.criticalSubnets} critical`}
          icon={<Layout className="w-6 h-6 text-green-500" />}
          loading={loading}
          alert={!loading && quickStats.criticalSubnets > 0}
          onClick={() => setActiveTab('subnets')}
        />
        <StatCard 
          label="Conflicts" 
          value={loading ? '...' : quickStats.conflicts} 
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          loading={loading}
          alert={!loading && quickStats.conflicts > 0}
          onClick={() => setActiveTab('conflicts')}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-azure-500 text-azure-600 dark:text-azure-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                } ${tab.highlight ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    tab.alert 
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' 
                      : tab.highlight
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {loading ? '...' : tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-azure-500 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading data from Azure...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab 
                ipAddresses={ipAddresses} 
                subnets={subnets} 
                conflicts={conflicts} 
                events={events}
                subscriptions={subscriptions}
                orphanResources={orphanResources}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'ipam' && <IPAMPoolsTab pools={filteredIPAMPools} />}
            {activeTab === 'ips' && <IPAddressesTab ipAddresses={filteredIPs} />}
            {activeTab === 'subnets' && <SubnetsTab subnets={filteredSubnets} />}
            {activeTab === 'conflicts' && <ConflictsTab conflicts={conflicts} />}
            {activeTab === 'events' && <EventsTab events={events} />}
            {activeTab === 'orphans' && <OrphanResourcesTab orphanResources={orphanResources} />}
          </>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: React.ReactNode
  loading?: boolean
  alert?: boolean
  onClick?: () => void
}

function StatCard({ label, value, subValue, icon, loading, alert, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all hover:shadow-md cursor-pointer hover:scale-105 ${
        alert ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        {icon}
        {alert && <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>
      <div className={`text-2xl font-bold mt-3 ${
        loading ? 'text-gray-400' : alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
      }`}>
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      {subValue && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subValue}</div>
      )}
    </div>
  )
}
