import { Subnet } from '../../types'
import UtilizationBar from '../UtilizationBar'
import SubnetDetailModal from '../SubnetDetailModal'
import { useState } from 'react'

interface SubnetsTabProps {
  subnets: Subnet[]
}

interface GroupedSubnets {
  [vnetName: string]: {
    vnetId: string
    location: string
    subscriptionName?: string
    resourceGroup: string
    subnets: Subnet[]
  }
}

export default function SubnetsTab({ subnets }: SubnetsTabProps) {
  const [expandedVnets, setExpandedVnets] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'utilization'>('name')
  const [selectedSubnet, setSelectedSubnet] = useState<Subnet | null>(null)

  // Group subnets by VNet
  const groupedSubnets = subnets.reduce<GroupedSubnets>((acc, subnet) => {
    const key = subnet.vnetId
    if (!acc[key]) {
      acc[key] = {
        vnetId: subnet.vnetId,
        location: subnet.location,
        subscriptionName: subnet.subscriptionName,
        resourceGroup: subnet.resourceGroup,
        subnets: [],
      }
    }
    acc[key].subnets.push(subnet)
    return acc
  }, {})

  // Sort subnets within each VNet
  Object.values(groupedSubnets).forEach(group => {
    group.subnets.sort((a, b) => {
      if (sortBy === 'utilization') {
        return b.utilizationPercent - a.utilizationPercent
      }
      return a.name.localeCompare(b.name)
    })
  })

  const toggleVnet = (vnetId: string) => {
    const newExpanded = new Set(expandedVnets)
    if (newExpanded.has(vnetId)) {
      newExpanded.delete(vnetId)
    } else {
      newExpanded.add(vnetId)
    }
    setExpandedVnets(newExpanded)
  }

  const expandAll = () => {
    setExpandedVnets(new Set(Object.keys(groupedSubnets)))
  }

  const collapseAll = () => {
    setExpandedVnets(new Set())
  }

  const openInAzurePortal = (resourceId: string) => {
    const portalUrl = `https://portal.azure.com/#@/resource${resourceId}`
    window.open(portalUrl, '_blank')
  }

  const totalSubnets = subnets.length
  const criticalSubnets = subnets.filter(s => s.utilizationPercent >= 80).length
  const warningSubnets = subnets.filter(s => s.utilizationPercent >= 50 && s.utilizationPercent < 80).length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subnets</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalSubnets} subnets across {Object.keys(groupedSubnets).length} VNets
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              0-49%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              50-79%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              80-100%
            </span>
          </div>
          
          <div className="border-l dark:border-gray-600 pl-4 flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'utilization')}
              className="text-sm border dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="name">Sort by Name</option>
              <option value="utilization">Sort by Utilization</option>
            </select>
            <button 
              onClick={expandAll}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalSubnets}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Subnets</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalSubnets}</div>
          <div className="text-sm text-red-500 dark:text-red-400">Critical (&gt;80%)</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warningSubnets}</div>
          <div className="text-sm text-amber-500 dark:text-amber-400">Warning (50-80%)</div>
        </div>
      </div>

      {/* VNet List */}
      <div className="space-y-2">
        {Object.entries(groupedSubnets).map(([vnetId, group]) => {
          const vnetName = group.subnets[0]?.vnetName || 'Unknown VNet'
          const isExpanded = expandedVnets.has(vnetId)
          
          return (
            <div key={vnetId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* VNet Header */}
              <button
                onClick={() => toggleVnet(vnetId)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`transform transition-transform text-gray-500 dark:text-gray-400 ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="text-lg">📁</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">{vnetName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {group.location} • {group.resourceGroup} • {group.subnets.length} subnets
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openInAzurePortal(vnetId)
                  }}
                  className="text-azure-600 dark:text-azure-400 hover:text-azure-800 dark:hover:text-azure-300 text-sm"
                >
                  Open in Portal →
                </button>
              </button>

              {/* Subnets Table */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <div className="col-span-3">Subnet Name</div>
                    <div className="col-span-2">CIDR Block</div>
                    <div className="col-span-1 text-right">Assigned</div>
                    <div className="col-span-1 text-right">Used</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-3">Utilization</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Subnet Rows */}
                  {group.subnets.map((subnet) => (
                    <div 
                      key={subnet.id}
                      onClick={() => setSelectedSubnet(subnet)}
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 items-center cursor-pointer transition-colors"
                    >
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 dark:text-gray-500">└─</span>
                          <span className="font-medium text-gray-900 dark:text-white">{subnet.name}</span>
                        </div>
                        {subnet.delegations.length > 0 && (
                          <span className="text-xs text-azure-600 dark:text-azure-400">
                            Delegated: {subnet.delegations.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 font-mono text-sm text-gray-600 dark:text-gray-300">
                        {subnet.addressPrefix}
                      </div>
                      <div className="col-span-1 text-right text-gray-500 dark:text-gray-400">
                        {subnet.assignedIPs || subnet.usedIPs}
                      </div>
                      <div className="col-span-1 text-right font-semibold text-gray-900 dark:text-white">
                        {subnet.usedIPs}
                      </div>
                      <div className="col-span-1 text-right text-gray-500 dark:text-gray-400">
                        {subnet.totalIPs}
                      </div>
                      <div className="col-span-3">
                        <UtilizationBar 
                          percent={subnet.utilizationPercent}
                          showLabel={false}
                          showInlinePercent={true}
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openInAzurePortal(subnet.id)
                          }}
                          className="text-azure-600 hover:text-azure-800 dark:text-azure-400 dark:hover:text-azure-300"
                          title="Open in Azure Portal"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {Object.keys(groupedSubnets).length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No subnets found matching your filters
        </div>
      )}
      
      {/* Subnet Detail Modal */}
      {selectedSubnet && (
        <SubnetDetailModal 
          subnet={selectedSubnet} 
          onClose={() => setSelectedSubnet(null)} 
        />
      )}
    </div>
  )
}
