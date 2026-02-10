import { queryResourceGraph } from './azureClient.js'
import { queries } from './resourceGraphQueries.js'

interface Subscription {
  subscriptionId: string
  name: string
  state: string
}

let subscriptionsCache: Subscription[] | null = null
let subscriptionMapCache: Map<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60 * 1000 // 60 seconds

export async function getSubscriptionsWithCache(
  subscriptionIds?: string[]
): Promise<{ subscriptions: Subscription[]; subscriptionMap: Map<string, string> }> {
  const now = Date.now()
  
  // Return cache if valid
  if (subscriptionsCache && subscriptionMapCache && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('Returning cached subscriptions')
    return {
      subscriptions: subscriptionsCache,
      subscriptionMap: subscriptionMapCache,
    }
  }

  // Fetch fresh data
  const subscriptions = await queryResourceGraph(queries.subscriptions, subscriptionIds) as Subscription[]
  const subscriptionMap = new Map(
    subscriptions.map(sub => [sub.subscriptionId, sub.name])
  )

  // Update cache
  subscriptionsCache = subscriptions
  subscriptionMapCache = subscriptionMap
  cacheTimestamp = now

  console.log(`Cached ${subscriptions.length} subscriptions`)

  return { subscriptions, subscriptionMap }
}

export function clearSubscriptionsCache() {
  subscriptionsCache = null
  subscriptionMapCache = null
  cacheTimestamp = 0
}