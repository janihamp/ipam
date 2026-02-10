import { AgGridReact } from 'ag-grid-react'
import { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { OrphanResource } from '../../types'
import { useMemo, useCallback, useState, useEffect } from 'react'

interface OrphanResourcesTabProps {
  orphanResources: OrphanResource[]
}

export default function OrphanResourcesTab({ orphanResources }: OrphanResourcesTabProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const openInAzurePortal = useCallback((resourceId: string) => {
    const portalUrl = `https://portal.azure.com/#@/resource${resourceId}`
    window.open(portalUrl, '_blank')
  }, [])

  const columnDefs = useMemo<ColDef<OrphanResource>[]>(() => [
    {
      headerName: 'Resource Name',
      field: 'name',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 200,
      cellRenderer: (params: { value: string; data?: OrphanResource }) => (
        <button
          onClick={() => params.data && openInAzurePortal(params.data.id)}
          className="text-azure-600 dark:text-azure-400 hover:text-azure-800 dark:hover:text-azure-300 hover:underline flex items-center gap-2"
        >
          <span>🔗</span>
          {params.value}
        </button>
      ),
    },
    {
      headerName: 'Type',
      field: 'type',
      sortable: true,
      filter: true,
      width: 130,
      cellRenderer: (params: { value: string }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          params.value === 'publicIP' 
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
            : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
        }`}>
          {params.value === 'publicIP' ? 'Public IP' : 'VNet'}
        </span>
      ),
    },
    {
      headerName: 'Details',
      field: 'details',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 200,
    },
    {
      headerName: 'Resource Group',
      field: 'resourceGroup',
      sortable: true,
      filter: true,
      width: 180,
    },
    {
      headerName: 'Subscription',
      field: 'subscriptionName',
      sortable: true,
      filter: true,
      width: 200,
      valueGetter: (params) => params.data?.subscriptionName || params.data?.subscriptionId,
    },
    {
      headerName: 'Location',
      field: 'location',
      sortable: true,
      filter: true,
      width: 120,
    },
  ], [openInAzurePortal])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
  }), [])

  const publicIPs = orphanResources.filter(r => r.type === 'publicIP')
  const vnets = orphanResources.filter(r => r.type === 'vnet')

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Orphan Resources</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {orphanResources.length} unattached resources found
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{orphanResources.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Orphan Resources</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{publicIPs.length}</div>
          <div className="text-sm text-blue-500 dark:text-blue-400">Unattached Public IPs</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{vnets.length}</div>
          <div className="text-sm text-purple-500 dark:text-purple-400">Empty VNets</div>
        </div>
      </div>

      {orphanResources.length === 0 ? (
        <div className="text-center py-12 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-green-800 dark:text-green-300">No Orphan Resources Found</h3>
          <p className="text-green-600 dark:text-green-400">All your resources are properly attached and in use.</p>
        </div>
      ) : (
        <div className={isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} style={{ width: '100%', height: 400 }}>
          <AgGridReact<OrphanResource>
            rowData={orphanResources}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            pagination={true}
            paginationPageSize={25}
            paginationPageSizeSelector={[25, 50, 100]}
            enableCellTextSelection={true}
          />
        </div>
      )}

      {orphanResources.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Cost Optimization Opportunity</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                These orphan resources are costing you money without providing value. 
                Consider deleting them or attaching them to resources.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
