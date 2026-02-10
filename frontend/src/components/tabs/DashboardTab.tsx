import { useMemo, useState, useEffect } from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  Globe, 
  Cloud, 
  Server, 
  Network, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Activity,
  Layers,
  Trash2
} from 'lucide-react'
import { IPAddress, Subnet, CIDRConflict, IPAMEvent, Subscription, OrphanResource } from '../../types'

interface DashboardTabProps {
  ipAddresses: IPAddress[]
  subnets: Subnet[]
  conflicts: CIDRConflict[]
  events: IPAMEvent[]
  subscriptions: Subscription[]
  orphanResources: OrphanResource[]
  onNavigate?: (tab: 'ips' | 'subnets' | 'conflicts' | 'events' | 'orphans') => void
}

export default function DashboardTab({ 
  ipAddresses, 
  subnets, 
  conflicts, 
  events, 
  subscriptions,
  orphanResources,
  onNavigate
}: DashboardTabProps) {
  
  // Track theme changes for smooth transitions
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  )
  
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'))
        }
      })
    })
    
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  // IP Type Distribution
  const ipTypeData = useMemo(() => {
    const publicIPs = ipAddresses.filter(ip => ip.type === 'Public').length
    const privateIPs = ipAddresses.filter(ip => ip.type === 'Private').length
    return [
      { name: 'Public IPs', value: publicIPs, color: '#0ea5e9' },
      { name: 'Private IPs', value: privateIPs, color: '#8b5cf6' }
    ].filter(d => d.value > 0)
  }, [ipAddresses])

  // Allocation Method Distribution
  const allocationData = useMemo(() => {
    const staticIPs = ipAddresses.filter(ip => ip.allocationMethod === 'Static').length
    const dynamicIPs = ipAddresses.filter(ip => ip.allocationMethod === 'Dynamic').length
    return [
      { name: 'Static', value: staticIPs, color: '#10b981' },
      { name: 'Dynamic', value: dynamicIPs, color: '#f59e0b' }
    ].filter(d => d.value > 0)
  }, [ipAddresses])

  // IPs by Subscription
  const ipsBySubscription = useMemo(() => {
    const countMap = new Map<string, number>()
    ipAddresses.forEach(ip => {
      const subName = subscriptions.find(s => s.id === ip.subscriptionId)?.name || ip.subscriptionId.slice(-8)
      countMap.set(subName, (countMap.get(subName) || 0) + 1)
    })
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ 
        name: name.length > 20 ? name.slice(0, 20) + '...' : name, 
        fullName: name,
        ips: count 
      }))
      .sort((a, b) => b.ips - a.ips)
      .slice(0, 8)
  }, [ipAddresses, subscriptions])

  // Subnet Utilization Distribution
  const subnetUtilization = useMemo(() => {
    const critical = subnets.filter(s => s.utilizationPercent >= 80).length
    const warning = subnets.filter(s => s.utilizationPercent >= 50 && s.utilizationPercent < 80).length
    const healthy = subnets.filter(s => s.utilizationPercent < 50).length
    return [
      { name: 'Critical (80%+)', value: critical, color: '#ef4444' },
      { name: 'Warning (50-79%)', value: warning, color: '#f59e0b' },
      { name: 'Healthy (<50%)', value: healthy, color: '#10b981' }
    ].filter(d => d.value > 0)
  }, [subnets])

  // Top 10 Most Utilized Subnets
  const topSubnets = useMemo(() => {
    return [...subnets]
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
      .slice(0, 10)
      .map(s => ({
        name: s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name,
        fullName: s.name,
        utilization: s.utilizationPercent,
        used: s.usedIPs || s.assignedIPs,
        total: s.totalIPs
      }))
  }, [subnets])

  // VNets by Subscription
  const vnetsBySubscription = useMemo(() => {
    const vnetMap = new Map<string, Set<string>>()
    subnets.forEach(s => {
      const subName = subscriptions.find(sub => sub.id === s.subscriptionId)?.name || s.subscriptionId.slice(-8)
      if (!vnetMap.has(subName)) {
        vnetMap.set(subName, new Set())
      }
      vnetMap.get(subName)!.add(s.vnetId)
    })
    return Array.from(vnetMap.entries())
      .map(([name, vnets]) => ({ 
        name: name.length > 20 ? name.slice(0, 20) + '...' : name, 
        vnets: vnets.size,
        subnets: subnets.filter(s => subscriptions.find(sub => sub.id === s.subscriptionId)?.name === name).length
      }))
      .sort((a, b) => b.vnets - a.vnets)
  }, [subnets, subscriptions])

  // Recent events (last 7 days)
  const recentEvents = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return events
      .filter(e => new Date(e.timestamp) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }, [events])

  // Summary stats
  const stats = useMemo(() => {
    const publicIPs = ipAddresses.filter(ip => ip.type === 'Public')
    const assignedPublic = publicIPs.filter(ip => ip.associatedResource).length
    const vnets = new Set(subnets.map(s => s.vnetId)).size
    const criticalSubnets = subnets.filter(s => s.utilizationPercent >= 80).length
    
    return {
      totalIPs: ipAddresses.length,
      publicIPs: publicIPs.length,
      privateIPs: ipAddresses.length - publicIPs.length,
      assignedPublic,
      unassignedPublic: publicIPs.length - assignedPublic,
      vnets,
      totalSubnets: subnets.length,
      criticalSubnets,
      conflicts: conflicts.length,
      orphans: orphanResources.length,
      subscriptionCount: subscriptions.length,
      avgUtilization: subnets.length > 0 
        ? Math.round(subnets.reduce((sum, s) => sum + s.utilizationPercent, 0) / subnets.length)
        : 0
    }
  }, [ipAddresses, subnets, conflicts, orphanResources, subscriptions])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'var(--tooltip-bg)', 
          border: '1px solid var(--tooltip-border)',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '12px'
        }}>
          <p style={{ fontWeight: 500, color: 'var(--tooltip-text)', marginBottom: '4px' }}>
            {payload[0].payload.fullName || payload[0].payload.name}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: '14px', color: 'var(--tooltip-subtext)' }}>
              {entry.name}: <span style={{ fontWeight: 600, color: entry.color || entry.payload?.color }}>{entry.value}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Custom label renderer for pie charts - uses CSS variables for theme support
  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, value }: any) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 25
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text
        x={x}
        y={y}
        className="pie-label"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {name}: {value}
      </text>
    )
  }

  const renderSimpleLabel = ({ cx, cy, midAngle, outerRadius, value }: any) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 20
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text
        x={x}
        y={y}
        className="pie-label"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {value}
      </text>
    )
  }

  // Theme-aware colors for inline styles (recharts requirement)
  const getLabelLineColor = () => isDark ? '#475569' : '#94a3b8'
  const getStrokeColor = () => isDark ? '#1f2937' : '#e2e8f0'
  const getLegendColor = () => isDark ? '#94a3b8' : '#475569'

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard 
          icon={<Globe className="w-5 h-5" />}
          label="Total IPs"
          value={stats.totalIPs}
          color="blue"
          onClick={() => onNavigate?.('ips')}
        />
        <SummaryCard 
          icon={<Cloud className="w-5 h-5" />}
          label="Public IPs"
          value={stats.publicIPs}
          subValue={`${stats.assignedPublic} assigned`}
          color="sky"
          onClick={() => onNavigate?.('ips')}
        />
        <SummaryCard 
          icon={<Server className="w-5 h-5" />}
          label="Private IPs"
          value={stats.privateIPs}
          color="purple"
          onClick={() => onNavigate?.('ips')}
        />
        <SummaryCard 
          icon={<Network className="w-5 h-5" />}
          label="VNets"
          value={stats.vnets}
          subValue={`${stats.totalSubnets} subnets`}
          color="green"
          onClick={() => onNavigate?.('subnets')}
        />
        <SummaryCard 
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Conflicts"
          value={stats.conflicts}
          color={stats.conflicts > 0 ? "red" : "gray"}
          alert={stats.conflicts > 0}
          onClick={() => onNavigate?.('conflicts')}
        />
        <SummaryCard 
          icon={<Trash2 className="w-5 h-5" />}
          label="Orphans"
          value={stats.orphans}
          color={stats.orphans > 0 ? "amber" : "gray"}
          alert={stats.orphans > 0}
          onClick={() => onNavigate?.('orphans')}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IP Type Distribution */}
        <ChartCard title="IP Type Distribution" icon={<Layers className="w-4 h-4" />}>
          {ipTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={ipTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={{ stroke: getLabelLineColor(), strokeWidth: 1 }}
                  stroke={getStrokeColor()}
                  strokeWidth={2}
                >
                  {ipTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No IP data available" />
          )}
        </ChartCard>

        {/* Allocation Method */}
        <ChartCard title="Allocation Method" icon={<TrendingUp className="w-4 h-4" />}>
          {allocationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={{ stroke: getLabelLineColor(), strokeWidth: 1 }}
                  stroke={getStrokeColor()}
                  strokeWidth={2}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No allocation data available" />
          )}
        </ChartCard>

        {/* Subnet Health */}
        <ChartCard title="Subnet Health" icon={<CheckCircle className="w-4 h-4" />}>
          {subnetUtilization.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={subnetUtilization}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                  label={renderSimpleLabel}
                  labelLine={{ stroke: getLabelLineColor(), strokeWidth: 1 }}
                  stroke={getStrokeColor()}
                  strokeWidth={2}
                >
                  {subnetUtilization.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ color: getLegendColor() }}
                  formatter={(value) => <span style={{ color: getLegendColor() }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No subnet data available" />
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IPs by Subscription */}
        <ChartCard title="IPs by Subscription" icon={<Globe className="w-4 h-4" />}>
          {ipsBySubscription.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ipsBySubscription} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis type="number" className="text-gray-600 dark:text-gray-400" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  className="text-gray-600 dark:text-gray-400" 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ips" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="IP Addresses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No subscription data available" />
          )}
        </ChartCard>

        {/* Top Utilized Subnets */}
        <ChartCard title="Top 10 Most Utilized Subnets" icon={<AlertCircle className="w-4 h-4" />}>
          {topSubnets.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topSubnets} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis type="number" domain={[0, 100]} unit="%" className="text-gray-600 dark:text-gray-400" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="utilization" 
                  name="Utilization %"
                  radius={[0, 4, 4, 0]}
                >
                  {topSubnets.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.utilization >= 80 ? '#ef4444' : entry.utilization >= 50 ? '#f59e0b' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No subnet data available" />
          )}
        </ChartCard>
      </div>

      {/* Bottom Row: VNets and Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VNets by Subscription */}
        <ChartCard title="VNets & Subnets by Subscription" icon={<Network className="w-4 h-4" />}>
          {vnetsBySubscription.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vnetsBySubscription} margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-gray-600 dark:text-gray-400" tick={{ fontSize: 10 }} />
                <YAxis className="text-gray-600 dark:text-gray-400" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="vnets" fill="#8b5cf6" name="VNets" radius={[4, 4, 0, 0]} />
                <Bar dataKey="subnets" fill="#10b981" name="Subnets" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No VNet data available" />
          )}
        </ChartCard>

        {/* Recent Activity */}
        <ChartCard title="Recent Activity" icon={<Activity className="w-4 h-4" />}>
          {recentEvents.length > 0 ? (
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {recentEvents.map((event, index) => (
                <EventItem key={event.id || index} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState message="No recent events" />
          )}
        </ChartCard>
      </div>

      {/* Infrastructure Summary */}
      <div className="bg-gradient-to-r from-azure-500 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Infrastructure Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-3xl font-bold">{stats.subscriptionCount}</div>
            <div className="text-blue-100 text-sm">Subscriptions</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.vnets}</div>
            <div className="text-blue-100 text-sm">Virtual Networks</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.totalSubnets}</div>
            <div className="text-blue-100 text-sm">Subnets</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.avgUtilization}%</div>
            <div className="text-blue-100 text-sm">Avg. Utilization</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: number
  subValue?: string
  color: 'blue' | 'sky' | 'purple' | 'green' | 'red' | 'amber' | 'gray'
  alert?: boolean
  onClick?: () => void
}

const colorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  gray: 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
}

function SummaryCard({ icon, label, value, subValue, color, alert, onClick }: SummaryCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-xl p-4 cursor-pointer transition-transform hover:scale-105 ${colorClasses[color]} ${alert ? 'ring-2 ring-offset-2 ring-red-400 dark:ring-offset-gray-900' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      {subValue && <div className="text-xs mt-1 opacity-75">{subValue}</div>}
    </div>
  )
}

interface ChartCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function ChartCard({ title, icon, children }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-gray-400 dark:text-gray-500">
      <p>{message}</p>
    </div>
  )
}

function EventItem({ event }: { event: IPAMEvent }) {
  const getEventIcon = () => {
    switch (event.eventType?.toLowerCase()) {
      case 'create':
        return <div className="w-2 h-2 rounded-full bg-green-500" />
      case 'delete':
        return <div className="w-2 h-2 rounded-full bg-red-500" />
      case 'update':
        return <div className="w-2 h-2 rounded-full bg-amber-500" />
      default:
        return <div className="w-2 h-2 rounded-full bg-blue-500" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Extract resource group from resourceId if available
  const getResourceGroup = () => {
    if (event.resourceId) {
      const parts = event.resourceId.split('/resourceGroups/')
      if (parts.length > 1) {
        return parts[1].split('/')[0]
      }
    }
    return event.subscriptionName || 'Unknown'
  }

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="mt-2">{getEventIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {event.eventType || 'Unknown'}: {event.resourceName || event.resourceType?.split('/').pop() || 'Resource'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {getResourceGroup()}
        </p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {formatTime(event.timestamp)}
      </span>
    </div>
  )
}
