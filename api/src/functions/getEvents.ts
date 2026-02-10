import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity'

interface IPAMEvent {
  id: string
  timestamp: string
  eventType: 'create' | 'update' | 'delete' | 'alert'
  category: string
  resourceId: string
  resourceName: string
  resourceType: string
  subscriptionId: string
  caller: string
  status: 'success' | 'failed' | 'warning'
  details: string
  operationId?: string
}

// Network-related operation names to filter
const NETWORK_OPERATIONS = [
  'Microsoft.Network/virtualNetworks/write',
  'Microsoft.Network/virtualNetworks/delete',
  'Microsoft.Network/virtualNetworks/subnets/write',
  'Microsoft.Network/virtualNetworks/subnets/delete',
  'Microsoft.Network/publicIPAddresses/write',
  'Microsoft.Network/publicIPAddresses/delete',
  'Microsoft.Network/networkInterfaces/write',
  'Microsoft.Network/networkInterfaces/delete',
]

export async function getEvents(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Getting events...')

  try {
    const timeRange = request.query.get('timeRange') || '7d'
    const subscriptionId = request.query.get('subscriptionId')
    
    // If no subscriptionId provided, return empty array
    // Events require a specific subscription to query
    if (!subscriptionId) {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      }
    }

    // Calculate time filter
    const now = new Date()
    let startTime: Date
    switch (timeRange) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default: // 7d
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get credential
    const tenantId = process.env.AZURE_TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    
    const credential = tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret)
      : new DefaultAzureCredential()

    // Get token for Azure Management API
    const token = await credential.getToken('https://management.azure.com/.default')

    // Query Activity Log API
    const filter = `eventTimestamp ge '${startTime.toISOString()}' and eventTimestamp le '${now.toISOString()}'`
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$filter=${encodeURIComponent(filter)}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Activity Log API error: ${response.status}`)
    }

    const data = await response.json() as { value: Array<{
      eventTimestamp: string
      operationName: { value: string; localizedValue: string }
      resourceId: string
      status: { value: string }
      caller: string
      correlationId: string
      properties?: { statusCode?: string }
    }> }

    // Filter and transform events
    const events: IPAMEvent[] = data.value
      .filter(event => {
        const opName = event.operationName?.value
        return NETWORK_OPERATIONS.some(op => opName?.includes(op.split('/')[1]))
      })
      .map(event => {
        const opName = event.operationName?.value || ''
        const resourceId = event.resourceId || ''
        const parts = resourceId.split('/')
        const resourceName = parts[parts.length - 1] || 'Unknown'
        
        // Determine event type and category
        let eventType: 'create' | 'update' | 'delete' = 'update'
        if (opName.includes('/write')) {
          eventType = event.properties?.statusCode === '201' ? 'create' : 'update'
        } else if (opName.includes('/delete')) {
          eventType = 'delete'
        }

        let category = 'vnet'
        if (opName.includes('subnet')) category = 'subnet'
        else if (opName.includes('publicIPAddresses')) category = 'publicIP'
        else if (opName.includes('networkInterfaces')) category = 'nic'

        return {
          id: event.correlationId || `evt-${Date.now()}`,
          timestamp: event.eventTimestamp,
          eventType,
          category,
          resourceId,
          resourceName,
          resourceType: opName.split('/').slice(0, 2).join('/'),
          subscriptionId,
          caller: event.caller || 'Unknown',
          status: event.status?.value === 'Succeeded' ? 'success' as const : 'failed' as const,
          details: event.operationName?.localizedValue || '',
          operationId: event.correlationId,
        }
      })
      .slice(0, 100) // Limit to 100 events

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    }
  } catch (error) {
    context.error('Error getting events:', error)
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get events' }),
    }
  }
}

app.http('getEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'events',
  handler: getEvents,
})
