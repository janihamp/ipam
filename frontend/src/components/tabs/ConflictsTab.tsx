import { CIDRConflict } from '../../types'

interface ConflictsTabProps {
  conflicts: CIDRConflict[]
}

export default function ConflictsTab({ conflicts }: ConflictsTabProps) {
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical')
  const warningConflicts = conflicts.filter(c => c.severity === 'warning')

  const openInAzurePortal = (resourceId: string) => {
    const portalUrl = `https://portal.azure.com/#@/resource${resourceId}`
    window.open(portalUrl, '_blank')
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CIDR Conflicts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overlapping address spaces detected across your VNets
          </p>
        </div>
      </div>

      {/* Summary */}
      {conflicts.length > 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <span className="text-xl">⚠️</span>
            <span className="font-semibold">
              {conflicts.length} CIDR Conflict{conflicts.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            {criticalConflicts.length} critical, {warningConflicts.length} warning
          </p>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <span className="text-xl">✅</span>
            <span className="font-semibold">No CIDR Conflicts Detected</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            All VNets have non-overlapping address spaces
          </p>
        </div>
      )}

      {/* Conflict Cards */}
      <div className="space-y-4">
        {conflicts.map((conflict, index) => (
          <div
            key={conflict.id}
            className={`border-l-4 ${
              conflict.severity === 'critical' 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
            } p-4 rounded-r-lg`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {conflict.severity === 'critical' ? '🔴' : '⚠️'}
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Conflict #{index + 1}: {conflict.type === 'overlap' ? 'Overlapping Address Spaces' : 
                      conflict.type === 'subset' ? 'Subset Overlap' : 'Superset Overlap'}
                  </h3>
                </div>
                
                {/* Resources Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden mt-3 mb-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Resource</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Address Space</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Location</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Subscription</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {conflict.resources.map((resource) => (
                        <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={conflict.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}>
                                {resource.type === 'vnet' ? '🔴' : '🟡'}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">{resource.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 font-mono text-gray-600 dark:text-gray-300">
                            {resource.addressSpace}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                            {resource.location}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                            {resource.subscriptionName || resource.subscriptionId.slice(0, 8) + '...'}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => openInAzurePortal(resource.id)}
                              className="text-azure-600 dark:text-azure-400 hover:text-azure-800 dark:hover:text-azure-300"
                            >
                              Open →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Issue:</span> {conflict.description}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">Impact:</span> {conflict.impact}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <button className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">
                View Details
              </button>
              <button className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">
                Ignore
              </button>
              <button 
                onClick={() => openInAzurePortal(conflict.resources[0]?.id || '')}
                className="px-3 py-1.5 text-sm bg-azure-500 text-white rounded-lg hover:bg-azure-600"
              >
                Open in Portal
              </button>
            </div>
          </div>
        ))}
      </div>

      {conflicts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Clear!</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            No overlapping address spaces found across your VNets
          </p>
        </div>
      )}
    </div>
  )
}
