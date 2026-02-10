import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { queryResourceGraph } from '../shared/azureClient.js'
import { queries } from '../shared/resourceGraphQueries.js'
import { findConflicts, CIDRRange } from '../shared/cidrUtils.js'

export async function getConflicts(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Getting CIDR conflicts...')

  try {
    const subscriptionIds = request.query.get('subscriptions')?.split(',').filter(Boolean)
    
    // Get all VNets with their address spaces
    const vnets = await queryResourceGraph(queries.virtualNetworks, subscriptionIds)
    
    // Convert to CIDRRange format
    const ranges: CIDRRange[] = vnets.map(vnet => ({
      id: vnet.id as string,
      name: vnet.name as string,
      cidr: vnet.addressPrefix as string,
      location: vnet.location as string,
      subscriptionId: vnet.subscriptionId as string,
      resourceGroup: vnet.resourceGroup as string,
      type: 'vnet' as const,
    }))

    // Find conflicts
    const conflicts = findConflicts(ranges)

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conflicts),
    }
  } catch (error) {
    context.error('Error getting conflicts:', error)
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get conflicts' }),
    }
  }
}

app.http('getConflicts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'conflicts',
  handler: getConflicts,
})
