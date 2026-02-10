import { 
  Network, 
  X, 
  List, 
  Layout, 
  AlertTriangle, 
  Activity, 
  Archive, 
  Search,
  Github,
  Linkedin
} from 'lucide-react'

interface AboutModalProps {
  onClose: () => void
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-azure-500 to-azure-600 rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Network className="w-7 h-7 text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">Azure IPAM</h2>
              <p className="text-azure-100 text-sm">IP Address Management Dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Version */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400 rounded-full text-sm font-medium">
              Version 1.0.0
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About Azure IPAM</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Azure IPAM is a comprehensive IP Address Management solution for Azure environments. 
              It provides visibility into your network resources across multiple subscriptions, 
              helping you manage IP addresses, track subnet utilization, detect CIDR conflicts, 
              and monitor network changes.
            </p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Features</h3>
            <div className="grid grid-cols-2 gap-3">
              <Feature icon={<List className="w-5 h-5 text-azure-500" />} title="IP Address Tracking" description="View all public and private IPs across your tenant" />
              <Feature icon={<Layout className="w-5 h-5 text-green-500" />} title="Subnet Management" description="Monitor subnet utilization with visual indicators" />
              <Feature icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} title="Conflict Detection" description="Identify overlapping CIDR blocks automatically" />
              <Feature icon={<Activity className="w-5 h-5 text-purple-500" />} title="Activity Logs" description="Track network changes and events" />
              <Feature icon={<Archive className="w-5 h-5 text-red-500" />} title="Orphan Detection" description="Find unused resources to optimize costs" />
              <Feature icon={<Search className="w-5 h-5 text-blue-500" />} title="Multi-Subscription" description="View resources across all subscriptions" />
            </div>
          </div>

          {/* Version History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Version History</h3>
            <div className="space-y-3">
              <VersionEntry 
                version="1.0.0" 
                date="February 2026" 
                changes={[
                  'Initial release',
                  'IP address tracking across subscriptions',
                  'Subnet utilization visualization',
                  'CIDR conflict detection',
                  'Azure Activity Log integration',
                  'Orphan resource detection',
                  'Dark/Light mode support',
                ]}
              />
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <a
              href="https://github.com/benarch/Azure-IPAM"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400"
            >
              <Github className="w-5 h-5" />
              GitHub Repository
            </a>
            <a
              href="https://linkedin.com/in/bendali"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400"
            >
              <Linkedin className="w-5 h-5" />
              Publisher
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-azure-500 text-white rounded-lg hover:bg-azure-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      {icon}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function VersionEntry({ version, date, changes }: { version: string; date: string; changes: string[] }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="px-2 py-0.5 bg-azure-500 text-white text-xs rounded font-medium">v{version}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{date}</span>
      </div>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        {changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-green-500">•</span>
            {change}
          </li>
        ))}
      </ul>
    </div>
  )
}
