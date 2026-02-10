import { Subnet } from '../types'
import UtilizationBar from './UtilizationBar'
import { X, ExternalLink } from 'lucide-react'

interface SubnetDetailModalProps {
  subnet: Subnet
  onClose: () => void
}

export default function SubnetDetailModal({ subnet, onClose }: SubnetDetailModalProps) {
  const openInAzurePortal = (resourceId: string) => {
    const portalUrl = `https://portal.azure.com/#@/resource${resourceId}`
    window.open(portalUrl, '_blank')
  }

  // Parse CIDR to get network info
  const cidrInfo = parseCIDR(subnet.addressPrefix)

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-azure-500 to-azure-600 rounded-t-xl">
          <div className="text-white">
            <h2 className="text-xl font-bold">{subnet.name}</h2>
            <p className="text-azure-100 text-sm mt-1">{subnet.vnetName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Subnet Info Block */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Subnet Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Subnet Name</label>
                <p className="font-medium text-gray-900 dark:text-white">{subnet.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Subnet Resource ID</label>
                <button
                  onClick={() => openInAzurePortal(subnet.id)}
                  className="text-azure-600 dark:text-azure-400 hover:underline text-sm truncate block max-w-full"
                  title={subnet.id}
                >
                  {subnet.id.split('/').slice(-3).join('/')}
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Belongs to VNet</label>
                <button
                  onClick={() => openInAzurePortal(subnet.vnetId)}
                  className="text-azure-600 dark:text-azure-400 hover:underline font-medium"
                >
                  {subnet.vnetName}
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Location</label>
                <p className="font-medium text-gray-900 dark:text-white">{subnet.location}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Has Route Table</label>
                <p className={`font-medium ${subnet.hasRouteTable ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {subnet.hasRouteTable ? '✓ Yes' : '✗ No'}
                  {subnet.routeTableId && (
                    <button
                      onClick={() => subnet.routeTableId && openInAzurePortal(subnet.routeTableId)}
                      className="ml-2 text-azure-600 dark:text-azure-400 hover:underline text-xs"
                    >
                      View
                    </button>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Has NSG</label>
                <p className={`font-medium ${subnet.hasNSG ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {subnet.hasNSG ? '✓ Yes' : '✗ No'}
                  {subnet.nsgId && (
                    <button
                      onClick={() => subnet.nsgId && openInAzurePortal(subnet.nsgId)}
                      className="ml-2 text-azure-600 dark:text-azure-400 hover:underline text-xs"
                    >
                      View
                    </button>
                  )}
                </p>
              </div>
            </div>
            {subnet.delegations.length > 0 && (
              <div className="mt-4">
                <label className="text-xs text-gray-500 dark:text-gray-400">Delegations</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {subnet.delegations.map((d: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-azure-100 dark:bg-azure-900/50 text-azure-700 dark:text-azure-300 rounded text-xs">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Network Block */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">
              Network Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-blue-500 dark:text-blue-400">CIDR Block</label>
                <p className="font-mono font-bold text-blue-900 dark:text-blue-100">{subnet.addressPrefix}</p>
              </div>
              <div>
                <label className="text-xs text-blue-500 dark:text-blue-400">Network ID</label>
                <p className="font-mono text-blue-900 dark:text-blue-100">{cidrInfo.networkId}</p>
              </div>
              <div>
                <label className="text-xs text-blue-500 dark:text-blue-400">Subnet Mask</label>
                <p className="font-mono text-blue-900 dark:text-blue-100">{cidrInfo.subnetMask}</p>
              </div>
              <div>
                <label className="text-xs text-blue-500 dark:text-blue-400">Broadcast Address</label>
                <p className="font-mono text-blue-900 dark:text-blue-100">{cidrInfo.broadcast}</p>
              </div>
              <div>
                <label className="text-xs text-blue-500 dark:text-blue-400">Subnet Size</label>
                <p className="font-mono text-blue-900 dark:text-blue-100">/{cidrInfo.prefix}</p>
              </div>
              <div>
                <label className="text-xs text-blue-500 dark:text-blue-400">Total IPs (Usable)</label>
                <p className="font-mono text-blue-900 dark:text-blue-100">{subnet.totalIPs}</p>
              </div>
            </div>
          </div>

          {/* Utilization Block */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              IP Address Utilization
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-azure-600 dark:text-azure-400">{subnet.assignedIPs}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Assigned IPs</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{subnet.usedIPs}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Used IPs</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{subnet.totalIPs - subnet.usedIPs}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Available IPs</div>
              </div>
            </div>
            <UtilizationBar percent={subnet.utilizationPercent} height="lg" showLabel={false} showInlinePercent={true} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {subnet.usedIPs} of {subnet.totalIPs} IPs in use
            </p>
          </div>

          {/* Subscription/RG Info */}
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
            <span>📁 {subnet.resourceGroup}</span>
            <span>•</span>
            <span>📋 {subnet.subscriptionName || subnet.subscriptionId}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Close
          </button>
          <button
            onClick={() => openInAzurePortal(subnet.id)}
            className="px-4 py-2 bg-azure-500 text-white rounded-lg hover:bg-azure-600 flex items-center gap-2"
          >
            <span>Open in Azure Portal</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper to parse CIDR notation
function parseCIDR(cidr: string): {
  networkId: string
  subnetMask: string
  broadcast: string
  prefix: number
} {
  const [ip, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr)
  const ipParts = ip.split('.').map(Number)
  
  // Calculate subnet mask
  const maskBits = prefix
  const mask: number[] = []
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, maskBits - i * 8))
    mask.push(256 - Math.pow(2, 8 - bits))
  }
  
  // Calculate network ID
  const networkId = ipParts.map((octet, i) => octet & mask[i]).join('.')
  
  // Calculate broadcast
  const inverseMask = mask.map(m => 255 - m)
  const broadcast = ipParts.map((octet, i) => (octet & mask[i]) | inverseMask[i]).join('.')
  
  return {
    networkId,
    subnetMask: mask.join('.'),
    broadcast,
    prefix,
  }
}
