import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity'
import { ResourceGraphClient } from '@azure/arm-resourcegraph'
import { SubscriptionClient } from '@azure/arm-subscriptions'

let subscriptionClient: SubscriptionClient | null = null
let resourceGraphClient: ResourceGraphClient | null = null

// Cache for Resource Graph queries
interface CacheEntry {
  data: any[]
  timestamp: number
}

const queryCache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 1000 // 60 seconds

export function getCredential() {
  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (tenantId && clientId && clientSecret) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret)
  }

  return new DefaultAzureCredential()
}

export function getSubscriptionClient(): SubscriptionClient {
  if (!subscriptionClient) {
    const credential = getCredential()
    subscriptionClient = new SubscriptionClient(credential)
  }
  return subscriptionClient
}

export function getResourceGraphClient(): ResourceGraphClient {
  if (!resourceGraphClient) {
    const credential = getCredential()
    resourceGraphClient = new ResourceGraphClient(credential)
  }
  return resourceGraphClient
}

export async function queryResourceGraph(
  query: string,
  subscriptionIds?: string[]
): Promise<any[]> {
  // Generate cache key
  const cacheKey = `${query}|${subscriptionIds?.join(',') || 'all'}`
  
  // Check cache
  const cached = queryCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('Returning cached Resource Graph query result')
    return cached.data
  }

  const client = getResourceGraphClient()
  
  // Get all subscription IDs if not provided
  if (!subscriptionIds || subscriptionIds.length === 0) {
    const subClient = getSubscriptionClient()
    const subs = []
    for await (const sub of subClient.subscriptions.list()) {
      if (sub.subscriptionId) {
        subs.push(sub.subscriptionId)
      }
    }
    subscriptionIds = subs
  }

  try {
    const result = await client.resources({
      query,
      subscriptions: subscriptionIds,
    })
    const data = (result.data as any[]) || []
    
    // Cache the result
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    })
    
    return data
  } catch (error: any) {
    // If rate limited, try to return stale cache
    if (error.statusCode === 429 && cached) {
      console.warn('Rate limited, returning stale cache')
      return cached.data
    }
    throw error
  }
}

// Clear cache function (optional)
export function clearResourceGraphCache() {
  queryCache.clear()
}
