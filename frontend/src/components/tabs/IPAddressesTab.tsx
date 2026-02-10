import { AgGridReact } from 'ag-grid-react'
import { ColDef, CellClickedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { IPAddress } from '../../types'
import { useMemo, useCallback, useState, useEffect } from 'react'

interface IPAddressesTabProps {
  ipAddresses: IPAddress[]
}

export default function IPAddressesTab({ ipAddresses }: IPAddressesTabProps) {
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

  const columnDefs = useMemo<ColDef<IPAddress>[]>(() => [
    {
      headerName: 'IP Address',
      field: 'ipAddress',
      sortable: true,
      filter: true,
      width: 150,
      cellRenderer: (params: { value: string; data?: IPAddress }) => (
        <button
          onClick={() => params.data && openInAzurePortal(params.data.id)}
          className="text-azure-600 dark:text-azure-400 hover:text-azure-800 dark:hover:text-azure-300 hover:underline font-mono flex items-center gap-1"
        >
          <span>🔗</span>
          {params.value || 'Not assigned'}
        </button>
      ),
    },
    {
      headerName: 'Type',
      field: 'type',
      sortable: true,
      filter: true,
      width: 100,
      cellRenderer: (params: { value: string }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          params.value === 'Public' 
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}>
          {params.value}
        </span>
      ),
    },
    {
      headerName: 'SKU',
      field: 'sku',
      sortable: true,
      filter: true,
      width: 100,
      cellRenderer: (params: { value: string | undefined }) => (
        params.value ? (
          <span className={`px-2 py-1 rounded text-xs ${
            params.value === 'Standard' 
              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' 
              : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
          }`}>
            {params.value}
          </span>
        ) : '-'
      ),
    },
    {
      headerName: 'Method',
      field: 'allocationMethod',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      headerName: 'Used By',
      field: 'associatedResource',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 200,
      cellRenderer: (params: { value: string | null; data?: IPAddress }) => {
        if (!params.value) return <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
        const resourceType = params.data?.associatedResourceType
        const icon = getResourceIcon(resourceType)
        return (
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="truncate">{params.value}</span>
          </span>
        )
      },
    },
    {
      headerName: 'Subnet/VNet',
      valueGetter: (params) => {
        if (params.data?.subnet && params.data?.vnet) {
          return `${params.data.subnet}/${params.data.vnet}`
        }
        return '-'
      },
      sortable: true,
      filter: true,
      width: 200,
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

  const handleCellClicked = useCallback((event: CellClickedEvent<IPAddress>) => {
    if (event.colDef.field !== 'ipAddress' && event.data) {
      // Could open a details panel here
      console.log('Row clicked:', event.data)
    }
  }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IP Addresses</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {ipAddresses.length} IP addresses found
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            Export CSV
          </button>
        </div>
      </div>

      <div className={isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} style={{ width: '100%', height: 'calc(100vh - 510px)' }}>
        <AgGridReact<IPAddress>
          rowData={ipAddresses}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onCellClicked={handleCellClicked}
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 500]}
          enableCellTextSelection={true}
        />
      </div>
    </div>
  )
}

function getResourceIcon(resourceType: string | null | undefined): string {
  if (!resourceType) return '❓'
  const type = resourceType.toLowerCase()
  if (type.includes('virtualmachine')) return '🖥️'
  if (type.includes('loadbalancer')) return '⚖️'
  if (type.includes('applicationgateway')) return '🌐'
  if (type.includes('bastion')) return '🏰'
  if (type.includes('firewall')) return '🔥'
  if (type.includes('natgateway')) return '🚪'
  if (type.includes('privateendpoint')) return '🔒'
  return '📦'
}
