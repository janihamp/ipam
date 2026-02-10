import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { queryResourceGraph } from '../shared/azureClient.js'
import { queries } from '../shared/resourceGraphQueries.js'
import { calculateTotalIPs } from '../shared/cidrUtils.js'

interface Subnet {
  id: string
  name: string
  vnetId: string
  vnetName: string
  resourceGroup: string
  subscriptionId: string
  subscriptionName: string | null
  location: string
  addressPrefix: string
  assignedIPs: number  // IPs assigned to NICs (includes deallocated VMs)
  usedIPs: number      // IPs actively in use
  totalIPs: number
  utilizationPercent: number
  delegations: string[]
  hasNSG: boolean
  hasRouteTable: boolean
  nsgId: string | null
  routeTableId: string | null
}

export async function getSubnets(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Getting subnets...')

  try {
    const subscriptionIds = request.query.get('subscriptions')?.split(',').filter(Boolean)
    
    // Get subscriptions for name mapping
    const subscriptions = await queryResourceGraph(queries.subscriptions, subscriptionIds)
    const subscriptionMap = new Map(subscriptions.map(sub => [sub.subscriptionId as string, sub.name as string]))
    
    // Get subnets
    const subnetData = await queryResourceGraph(queries.subnets, subscriptionIds)
    
    // Get NICs to count assigned IPs per subnet (this includes deallocated VMs)
    const nics = await queryResourceGraph(queries.networkInterfaces, subscriptionIds)
    const subnetAssignedIPs = new Map<string, number>()
    for (const nic of nics) {
      const subnetId = nic.subnetId as string | null
      if (subnetId) {
        subnetAssignedIPs.set(subnetId, (subnetAssignedIPs.get(subnetId) || 0) + 1)
      }
    }
    
    const subnets: Subnet[] = subnetData.map(subnet => {
      const subnetId = subnet.subnetId as string
      const addressPrefix = subnet.addressPrefix as string
      const totalIPs = calculateTotalIPs(addressPrefix)
      const usedIPs = (subnet.ipConfigCount as number) || 0
      const assignedIPs = subnetAssignedIPs.get(subnetId) || usedIPs
      const utilizationPercent = totalIPs > 0 ? (usedIPs / totalIPs) * 100 : 0

      // Extract delegation names
      const delegations: string[] = []
      const delegationData = subnet.delegations as { properties?: { serviceName?: string } }[] | null
      if (delegationData && Array.isArray(delegationData)) {
        for (const d of delegationData) {
          if (d.properties?.serviceName) {
            delegations.push(d.properties.serviceName)
          }
        }
      }
      
      const subscriptionId = subnet.subscriptionId as string

      return {
        id: subnetId,
        name: subnet.subnetName as string,
        vnetId: subnet.vnetId as string,
        vnetName: subnet.vnetName as string,
        resourceGroup: subnet.resourceGroup as string,
        subscriptionId,
        subscriptionName: subscriptionMap.get(subscriptionId) || null,
        location: subnet.location as string,
        addressPrefix,
        assignedIPs,
        usedIPs,
        totalIPs,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        delegations,
        hasNSG: !!subnet.nsgId,
        hasRouteTable: !!subnet.routeTableId,
        nsgId: (subnet.nsgId as string | null) || null,
        routeTableId: (subnet.routeTableId as string | null) || null,
      }
    })

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subnets),
    }
  } catch (error) {
    context.error('Error getting subnets:', error)
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get subnets' }),
    }
  }
}

app.http('getSubnets', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'subnets',
  handler: getSubnets,
})
