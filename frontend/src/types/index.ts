// IP Address types
export interface PublicIPAddress {
  id: string
  name: string
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  location: string
  ipAddress: string | null
  allocationMethod: 'Static' | 'Dynamic'
  sku: 'Basic' | 'Standard'
  version: 'IPv4' | 'IPv6'
  associatedResourceId: string | null
  associatedResourceType: string | null
  associatedResourceName: string | null
  tags: Record<string, string>
}

export interface PrivateIPAddress {
  id: string
  nicId: string
  nicName: string
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  location: string
  ipAddress: string
  allocationMethod: 'Static' | 'Dynamic'
  subnetId: string
  subnetName: string
  vnetName: string
  vmId: string | null
  vmName: string | null
  publicIpId: string | null
  isPrimary: boolean
}

export interface IPAddress {
  id: string
  ipAddress: string
  type: 'Public' | 'Private'
  allocationMethod: 'Static' | 'Dynamic'
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  location: string
  associatedResource: string | null
  associatedResourceType: string | null
  subnet?: string
  vnet?: string
  sku?: string
}

// Subnet types
export interface Subnet {
  id: string
  name: string
  vnetId: string
  vnetName: string
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  location: string
  addressPrefix: string
  assignedIPs: number
  usedIPs: number
  totalIPs: number
  utilizationPercent: number
  delegations: string[]
  hasNSG: boolean
  hasRouteTable: boolean
  nsgId?: string | null
  routeTableId?: string | null
}

export interface VNet {
  id: string
  name: string
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  location: string
  addressSpaces: string[]
  subnets: Subnet[]
  peerings: string[]
  dnsServers: string[]
}

// Azure Virtual Network Manager IPAM Types
export interface IPAMPool {
  id: string
  name: string
  description?: string
  addressPrefixes: string[]
  parentPoolId?: string
  location: string
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  allocations: IPAMAllocation[]
  utilization: {
    totalAddresses: number
    allocatedAddresses: number
    availableAddresses: number
    percentUsed: number
  }
  tags?: Record<string, string>
}

export interface IPAMAllocation {
  id: string
  poolId: string
  addressPrefix: string
  resourceId: string
  resourceName: string
  resourceType: string
  allocationTime: string
}

export interface NetworkManagerIPAM {
  id: string
  name: string
  location: string
  resourceGroup: string
  subscriptionId: string
  pools: IPAMPool[]
  totalPools: number
  totalAllocations: number
}

// Conflict types
export interface CIDRConflict {
  id: string
  severity: 'warning' | 'critical'
  type: 'overlap' | 'subset' | 'superset'
  description: string
  resources: ConflictResource[]
  impact: string
  detectedAt: string
}

export interface ConflictResource {
  id: string
  name: string
  type: 'vnet' | 'subnet'
  addressSpace: string
  location: string
  subscriptionId: string
  subscriptionName?: string
  resourceGroup: string
}

// Event types
export interface IPAMEvent {
  id: string
  timestamp: string
  eventType: 'create' | 'update' | 'delete' | 'alert' | 'quota'
  category: 'subnet' | 'publicIP' | 'vnet' | 'nic' | 'conflict' | 'exhaustion' | 'quota'
  resourceId: string
  resourceName: string
  resourceType: string
  subscriptionId: string
  subscriptionName?: string
  caller: string
  status: 'success' | 'failed' | 'warning'
  details: string
  operationId?: string
}

// Filter types
export interface Subscription {
  id: string
  name: string
  state: string
}

export interface ResourceGroup {
  id: string
  name: string
  subscriptionId: string
  location: string
}

export interface FilterState {
  subscriptions: string[]
  resourceGroups: string[]
  ipType: 'all' | 'public' | 'private'
  allocationMethod: 'all' | 'static' | 'dynamic'
  searchQuery: string
}

// Refresh mode
export type RefreshMode = 'manual' | 'auto' | 'realtime'

// Quick Stats for sidebar - Updated to include IPAM
export interface QuickStats {
  totalIPs: number
  subnets: number
  conflicts: number
  ipamPools?: number
  ipamAllocations?: number
}

// Orphan Resource types
export interface OrphanResource {
  id: string
  name: string
  type: 'publicIP' | 'vnet'
  resourceGroup: string
  subscriptionId: string
  subscriptionName?: string
  location: string
  createdAt?: string
  details: string
}

// Quota types
export interface QuotaUsage {
  location: string
  resourceType: string
  currentValue: number
  limit: number
  percentUsed: number
}

// API response types
export interface APIResponse<T> {
  data: T
  timestamp: string
  nextLink?: string
}
