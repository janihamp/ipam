import axios from 'axios'
import { IPAddress, Subnet, CIDRConflict, IPAMEvent, Subscription, QuotaUsage, IPAMPool, NetworkManagerIPAM, IPAMAllocation } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Set to false to use real Azure data via API
const USE_MOCK_DATA = true

export const apiService = {
  async getSubscriptions(): Promise<Subscription[]> {
    if (USE_MOCK_DATA) return mockData.subscriptions
    const response = await api.get('/subscriptions')
    return response.data
  },

  async getIPAddresses(): Promise<IPAddress[]> {
    if (USE_MOCK_DATA) return mockData.ipAddresses
    const response = await api.get('/ip-addresses')
    return response.data
  },

  async getSubnets(): Promise<Subnet[]> {
    if (USE_MOCK_DATA) return mockData.subnets
    const response = await api.get('/subnets')
    return response.data
  },

  async getConflicts(): Promise<CIDRConflict[]> {
    if (USE_MOCK_DATA) return mockData.conflicts
    const response = await api.get('/conflicts')
    return response.data
  },

  async getEvents(): Promise<IPAMEvent[]> {
    if (USE_MOCK_DATA) return mockData.events
    const response = await api.get('/events')
    return response.data
  },

  async getQuotaUsage(): Promise<QuotaUsage[]> {
    if (USE_MOCK_DATA) return mockData.quotaUsage
    const response = await api.get('/quota-usage')
    return response.data
  },

  // New: Azure Virtual Network Manager IPAM endpoints
  async getNetworkManagerIPAM(): Promise<NetworkManagerIPAM[]> {
    if (USE_MOCK_DATA) return mockData.networkManagerIPAM
    const response = await api.get('/network-manager-ipam')
    return response.data
  },

  async getIPAMPools(): Promise<IPAMPool[]> {
    if (USE_MOCK_DATA) return mockData.ipamPools
    const response = await api.get('/ipam-pools')
    return response.data
  },

  async createIPAMPool(pool: Partial<IPAMPool>): Promise<IPAMPool> {
    if (USE_MOCK_DATA) {
      const newPool: IPAMPool = {
        id: `/subscriptions/${pool.subscriptionId}/resourceGroups/${pool.resourceGroup}/providers/Microsoft.Network/networkManagers/nm-${pool.name}/ipamPools/${pool.name}`,
        name: pool.name || 'new-pool',
        description: pool.description,
        addressPrefixes: pool.addressPrefixes || [],
        location: pool.location || 'eastus',
        resourceGroup: pool.resourceGroup || 'rg-ipam',
        subscriptionId: pool.subscriptionId || mockData.subscriptions[0].id,
        subscriptionName: mockData.subscriptions[0].name,
        allocations: [],
        utilization: {
          totalAddresses: 65536,
          allocatedAddresses: 0,
          availableAddresses: 65536,
          percentUsed: 0,
        },
        tags: pool.tags,
      }
      return newPool
    }
    const response = await api.post('/ipam-pools', pool)
    return response.data
  },

  async allocateFromPool(poolId: string, allocation: { addressPrefix: string; resourceId: string }): Promise<IPAMAllocation> {
    if (USE_MOCK_DATA) {
      const newAllocation: IPAMAllocation = {
        id: `${poolId}/allocations/alloc-${Date.now()}`,
        poolId,
        addressPrefix: allocation.addressPrefix,
        resourceId: allocation.resourceId,
        resourceName: allocation.resourceId.split('/').pop() || 'resource',
        resourceType: 'Microsoft.Network/virtualNetworks',
        allocationTime: new Date().toISOString(),
      }
      return newAllocation
    }
    const response = await api.post(`/ipam-pools/${encodeURIComponent(poolId)}/allocate`, allocation)
    return response.data
  },
}

// Mock data for local development
const mockData = {
  subscriptions: [
    { id: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca', name: 'Production', state: 'Enabled' },
    { id: 'sub-dev-001', name: 'Development', state: 'Enabled' },
    { id: 'sub-staging-001', name: 'Staging', state: 'Enabled' },
  ],

  ipAddresses: [
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/networkInterfaces/nic-web-01/ipConfigurations/ipconfig1',
      ipAddress: '10.0.1.4',
      type: 'Private' as const,
      allocationMethod: 'Static' as const,
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      associatedResource: 'vm-web-01',
      associatedResourceType: 'Microsoft.Compute/virtualMachines',
      subnet: 'subnet-web',
      vnet: 'vnet-prod',
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/networkInterfaces/nic-web-02/ipConfigurations/ipconfig1',
      ipAddress: '10.0.1.5',
      type: 'Private' as const,
      allocationMethod: 'Dynamic' as const,
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      associatedResource: 'vm-web-02',
      associatedResourceType: 'Microsoft.Compute/virtualMachines',
      subnet: 'subnet-web',
      vnet: 'vnet-prod',
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/networkInterfaces/nic-app-01/ipConfigurations/ipconfig1',
      ipAddress: '10.0.2.10',
      type: 'Private' as const,
      allocationMethod: 'Static' as const,
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      associatedResource: 'lb-internal',
      associatedResourceType: 'Microsoft.Network/loadBalancers',
      subnet: 'subnet-app',
      vnet: 'vnet-prod',
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/publicIPAddresses/pip-bastion',
      ipAddress: '20.185.100.50',
      type: 'Public' as const,
      allocationMethod: 'Static' as const,
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      associatedResource: 'vm-bastion',
      associatedResourceType: 'Microsoft.Compute/virtualMachines',
      sku: 'Standard',
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/publicIPAddresses/pip-appgw',
      ipAddress: '52.142.90.15',
      type: 'Public' as const,
      allocationMethod: 'Dynamic' as const,
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      associatedResource: 'appgw-frontend',
      associatedResourceType: 'Microsoft.Network/applicationGateways',
      sku: 'Basic',
    },
    {
      id: '/subscriptions/sub-dev-001/resourceGroups/rg-dev/providers/Microsoft.Network/networkInterfaces/nic-dev-01/ipConfigurations/ipconfig1',
      ipAddress: '10.1.0.10',
      type: 'Private' as const,
      allocationMethod: 'Dynamic' as const,
      resourceGroup: 'rg-dev',
      subscriptionId: 'sub-dev-001',
      subscriptionName: 'Development',
      location: 'westus2',
      associatedResource: 'vm-dev-01',
      associatedResourceType: 'Microsoft.Compute/virtualMachines',
      subnet: 'subnet-dev',
      vnet: 'vnet-dev',
    },
  ],

  subnets: [
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-web',
      name: 'subnet-web',
      vnetId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod',
      vnetName: 'vnet-prod',
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      addressPrefix: '10.0.1.0/24',
      assignedIPs: 240,
      usedIPs: 234,
      totalIPs: 254,
      utilizationPercent: 92.1,
      delegations: [],
      hasNSG: true,
      hasRouteTable: true,
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-app',
      name: 'subnet-app',
      vnetId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod',
      vnetName: 'vnet-prod',
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      addressPrefix: '10.0.2.0/24',
      assignedIPs: 160,
      usedIPs: 156,
      totalIPs: 254,
      utilizationPercent: 61.4,
      delegations: [],
      hasNSG: true,
      hasRouteTable: false,
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-db',
      name: 'subnet-db',
      vnetId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod',
      vnetName: 'vnet-prod',
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      addressPrefix: '10.0.3.0/26',
      assignedIPs: 14,
      usedIPs: 12,
      totalIPs: 62,
      utilizationPercent: 19.4,
      delegations: ['Microsoft.Sql/managedInstances'],
      hasNSG: true,
      hasRouteTable: true,
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/GatewaySubnet',
      name: 'GatewaySubnet',
      vnetId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod',
      vnetName: 'vnet-prod',
      resourceGroup: 'rg-prod',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      location: 'eastus',
      addressPrefix: '10.0.255.0/27',
      assignedIPs: 4,
      usedIPs: 4,
      totalIPs: 30,
      utilizationPercent: 13.3,
      delegations: [],
      hasNSG: false,
      hasRouteTable: false,
    },
    {
      id: '/subscriptions/sub-dev-001/resourceGroups/rg-dev/providers/Microsoft.Network/virtualNetworks/vnet-dev/subnets/subnet-dev',
      name: 'subnet-dev',
      vnetId: '/subscriptions/sub-dev-001/resourceGroups/rg-dev/providers/Microsoft.Network/virtualNetworks/vnet-dev',
      vnetName: 'vnet-dev',
      resourceGroup: 'rg-dev',
      subscriptionId: 'sub-dev-001',
      subscriptionName: 'Development',
      location: 'westus2',
      addressPrefix: '10.1.0.0/24',
      assignedIPs: 50,
      usedIPs: 45,
      totalIPs: 254,
      utilizationPercent: 17.7,
      delegations: [],
      hasNSG: true,
      hasRouteTable: false,
    },
  ],

  conflicts: [
    {
      id: 'conflict-001',
      severity: 'critical' as const,
      type: 'subset' as const,
      description: '10.0.0.0/24 is completely contained within 10.0.0.0/16',
      resources: [
        {
          id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod-eastus',
          name: 'vnet-prod-eastus',
          type: 'vnet' as const,
          addressSpace: '10.0.0.0/16',
          location: 'eastus',
          subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
          subscriptionName: 'Production',
          resourceGroup: 'rg-prod',
        },
        {
          id: '/subscriptions/sub-staging-001/resourceGroups/rg-legacy/providers/Microsoft.Network/virtualNetworks/vnet-legacy-westus',
          name: 'vnet-legacy-westus',
          type: 'vnet' as const,
          addressSpace: '10.0.0.0/24',
          location: 'westus',
          subscriptionId: 'sub-staging-001',
          subscriptionName: 'Staging',
          resourceGroup: 'rg-legacy',
        },
      ],
      impact: 'Cannot peer these VNets; routing conflicts if connected via VPN',
      detectedAt: '2026-02-04T10:30:00Z',
    },
    {
      id: 'conflict-002',
      severity: 'warning' as const,
      type: 'overlap' as const,
      description: '172.16.2.0-172.16.3.255 overlaps in both VNets',
      resources: [
        {
          id: '/subscriptions/sub-staging-001/resourceGroups/rg-staging/providers/Microsoft.Network/virtualNetworks/vnet-staging',
          name: 'vnet-staging',
          type: 'vnet' as const,
          addressSpace: '172.16.0.0/22',
          location: 'eastus2',
          subscriptionId: 'sub-staging-001',
          subscriptionName: 'Staging',
          resourceGroup: 'rg-staging',
        },
        {
          id: '/subscriptions/sub-dev-001/resourceGroups/rg-qa/providers/Microsoft.Network/virtualNetworks/vnet-qa',
          name: 'vnet-qa',
          type: 'vnet' as const,
          addressSpace: '172.16.2.0/23',
          location: 'centralus',
          subscriptionId: 'sub-dev-001',
          subscriptionName: 'Development',
          resourceGroup: 'rg-qa',
        },
      ],
      impact: 'Partial address conflict may cause routing issues if peered',
      detectedAt: '2026-02-03T15:45:00Z',
    },
  ],

  events: [
    {
      id: 'evt-001',
      timestamp: '2026-02-04T10:32:00Z',
      eventType: 'create' as const,
      category: 'subnet' as const,
      resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-new',
      resourceName: 'vnet-prod/subnet-new',
      resourceType: 'Microsoft.Network/virtualNetworks/subnets',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      caller: 'john@contoso.com',
      status: 'success' as const,
      details: 'Subnet created with CIDR 10.0.10.0/24',
    },
    {
      id: 'evt-002',
      timestamp: '2026-02-04T09:15:00Z',
      eventType: 'create' as const,
      category: 'publicIP' as const,
      resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/publicIPAddresses/pip-loadbalancer-frontend',
      resourceName: 'pip-loadbalancer-frontend',
      resourceType: 'Microsoft.Network/publicIPAddresses',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      caller: 'azurepipeline',
      status: 'success' as const,
      details: 'Standard SKU, Static allocation',
    },
    {
      id: 'evt-003',
      timestamp: '2026-02-03T17:45:00Z',
      eventType: 'alert' as const,
      category: 'exhaustion' as const,
      resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-web',
      resourceName: 'vnet-prod/subnet-web',
      resourceType: 'Microsoft.Network/virtualNetworks/subnets',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      caller: 'system',
      status: 'warning' as const,
      details: '92% capacity reached (234/254)',
    },
    {
      id: 'evt-004',
      timestamp: '2026-02-03T14:20:00Z',
      eventType: 'alert' as const,
      category: 'quota' as const,
      resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      resourceName: 'Public IPs (EastUS)',
      resourceType: 'Microsoft.Network/publicIPAddresses',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      caller: 'system',
      status: 'warning' as const,
      details: '847/1000 quota used (85%)',
    },
    {
      id: 'evt-005',
      timestamp: '2026-02-02T11:30:00Z',
      eventType: 'alert' as const,
      category: 'conflict' as const,
      resourceId: '/subscriptions/sub-staging-001/resourceGroups/rg-legacy/providers/Microsoft.Network/virtualNetworks/vnet-legacy-westus',
      resourceName: 'vnet-legacy-westus',
      resourceType: 'Microsoft.Network/virtualNetworks',
      subscriptionId: 'sub-staging-001',
      subscriptionName: 'Staging',
      caller: 'admin@contoso.com',
      status: 'warning' as const,
      details: 'Overlaps with vnet-prod-eastus',
    },
    {
      id: 'evt-006',
      timestamp: '2026-02-01T08:00:00Z',
      eventType: 'create' as const,
      category: 'vnet' as const,
      resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-dr/providers/Microsoft.Network/virtualNetworks/vnet-dr-westus2',
      resourceName: 'vnet-dr-westus2',
      resourceType: 'Microsoft.Network/virtualNetworks',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      caller: 'terraform-sp',
      status: 'success' as const,
      details: 'DR VNet created in West US 2',
    },
  ],

  quotaUsage: [
    { location: 'eastus', resourceType: 'PublicIPAddresses', currentValue: 847, limit: 1000, percentUsed: 84.7 },
    { location: 'westus2', resourceType: 'PublicIPAddresses', currentValue: 234, limit: 1000, percentUsed: 23.4 },
    { location: 'eastus', resourceType: 'VirtualNetworks', currentValue: 45, limit: 500, percentUsed: 9.0 },
  ],

  // NEW: Network Manager IPAM mock data
  networkManagerIPAM: [
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-network/providers/Microsoft.Network/networkManagers/nm-enterprise',
      name: 'nm-enterprise',
      location: 'eastus',
      resourceGroup: 'rg-network',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      pools: [],
      totalPools: 3,
      totalAllocations: 3,
    },
  ] as NetworkManagerIPAM[],

  ipamPools: [
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-network/providers/Microsoft.Network/networkManagers/nm-enterprise/ipamPools/pool-prod-eastus',
      name: 'pool-prod-eastus',
      description: 'Production workloads in East US',
      addressPrefixes: ['10.0.0.0/16'],
      location: 'eastus',
      resourceGroup: 'rg-network',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      allocations: [
        {
          id: 'alloc-001',
          poolId: 'pool-prod-eastus',
          addressPrefix: '10.0.0.0/24',
          resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod',
          resourceName: 'vnet-prod',
          resourceType: 'Microsoft.Network/virtualNetworks',
          allocationTime: '2026-01-15T10:30:00Z',
        },
        {
          id: 'alloc-002',
          poolId: 'pool-prod-eastus',
          addressPrefix: '10.0.1.0/24',
          resourceId: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod-web',
          resourceName: 'vnet-prod-web',
          resourceType: 'Microsoft.Network/virtualNetworks',
          allocationTime: '2026-01-20T14:15:00Z',
        },
      ],
      utilization: {
        totalAddresses: 65536,
        allocatedAddresses: 512,
        availableAddresses: 65024,
        percentUsed: 0.78,
      },
      tags: {
        environment: 'production',
        region: 'eastus',
      },
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-network/providers/Microsoft.Network/networkManagers/nm-enterprise/ipamPools/pool-dev-westus',
      name: 'pool-dev-westus',
      description: 'Development and testing workloads',
      addressPrefixes: ['172.16.0.0/12'],
      location: 'westus2',
      resourceGroup: 'rg-network',
      subscriptionId: 'sub-dev-001',
      subscriptionName: 'Development',
      allocations: [
        {
          id: 'alloc-003',
          poolId: 'pool-dev-westus',
          addressPrefix: '172.16.0.0/16',
          resourceId: '/subscriptions/sub-dev-001/resourceGroups/rg-dev/providers/Microsoft.Network/virtualNetworks/vnet-dev',
          resourceName: 'vnet-dev',
          resourceType: 'Microsoft.Network/virtualNetworks',
          allocationTime: '2026-02-01T09:00:00Z',
        },
      ],
      utilization: {
        totalAddresses: 1048576,
        allocatedAddresses: 65536,
        availableAddresses: 983040,
        percentUsed: 6.25,
      },
      tags: {
        environment: 'development',
        region: 'westus2',
      },
    },
    {
      id: '/subscriptions/87ec57f9-f0ea-43d1-822b-8c9a98d889ca/resourceGroups/rg-network/providers/Microsoft.Network/networkManagers/nm-enterprise/ipamPools/pool-reserved',
      name: 'pool-reserved',
      description: 'Reserved address space for future expansion',
      addressPrefixes: ['192.168.0.0/16'],
      location: 'centralus',
      resourceGroup: 'rg-network',
      subscriptionId: '87ec57f9-f0ea-43d1-822b-8c9a98d889ca',
      subscriptionName: 'Production',
      allocations: [],
      utilization: {
        totalAddresses: 65536,
        allocatedAddresses: 0,
        availableAddresses: 65536,
        percentUsed: 0,
      },
      tags: {
        purpose: 'reserved',
        region: 'centralus',
      },
    },
  ] as IPAMPool[],
}
