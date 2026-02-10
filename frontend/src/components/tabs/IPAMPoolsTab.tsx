import { IPAMPool } from '../../types'
import { Database, TrendingUp, AlertCircle, MapPin, Tag } from 'lucide-react'

interface IPAMPoolsTabProps {
  pools: IPAMPool[]
}

export default function IPAMPoolsTab({ pools }: IPAMPoolsTabProps) {
  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600 dark:text-red-400'
    if (percent >= 75) return 'text-orange-600 dark:text-orange-400'
    if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getUtilizationBgColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-100 dark:bg-red-900/20'
    if (percent >= 75) return 'bg-orange-100 dark:bg-orange-900/20'
    if (percent >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-green-100 dark:bg-green-900/20'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Azure Network Manager IPAM Pools
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Centralized IP address management using Azure Virtual Network Manager
        </p>
      </div>

      {pools.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No IPAM pools found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Create an IPAM pool to manage IP address allocations centrally
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Pool Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="w-6 h-6 text-azure-500" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {pool.name}
                      </h3>
                    </div>
                    {pool.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{pool.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {pool.location}
                      </div>
                      <div className="text-gray-500 dark:text-gray-500">
                        {pool.subscriptionName || pool.subscriptionId}
                      </div>
                      <div className="text-gray-500 dark:text-gray-500">{pool.resourceGroup}</div>
                    </div>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${getUtilizationBgColor(pool.utilization.percentUsed)}`}
                  >
                    <div
                      className={`text-2xl font-bold ${getUtilizationColor(pool.utilization.percentUsed)}`}
                    >
                      {pool.utilization.percentUsed.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Utilized</div>
                  </div>
                </div>
              </div>

              {/* Address Prefixes */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Address Prefixes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {pool.addressPrefixes.map((prefix, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md font-mono text-sm"
                    >
                      {prefix}
                    </span>
                  ))}
                </div>
              </div>

              {/* Utilization Stats */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Total Addresses
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {pool.utilization.totalAddresses.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Allocated</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {pool.utilization.allocatedAddresses.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Available</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {pool.utilization.availableAddresses.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pool.utilization.percentUsed >= 90
                          ? 'bg-red-500'
                          : pool.utilization.percentUsed >= 75
                          ? 'bg-orange-500'
                          : pool.utilization.percentUsed >= 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(pool.utilization.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Allocations */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Allocations ({pool.allocations.length})
                  </h4>
                  {pool.utilization.percentUsed >= 80 && (
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      High utilization
                    </div>
                  )}
                </div>

                {pool.allocations.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                    No allocations yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pool.allocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {allocation.resourceName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {allocation.resourceType}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold text-azure-600 dark:text-azure-400">
                            {allocation.addressPrefix}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(allocation.allocationTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              {pool.tags && Object.keys(pool.tags).length > 0 && (
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tags</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(pool.tags).map(([key, value]) => (
                      <span
                        key={key}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}