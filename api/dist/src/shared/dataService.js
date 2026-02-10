import { queryResourceGraph } from './azureClient.js';
import { queries } from './resourceGraphQueries.js';
let subscriptionsCache = null;
let subscriptionMapCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds
export async function getSubscriptionsWithCache(subscriptionIds) {
    const now = Date.now();
    // Return cache if valid
    if (subscriptionsCache && subscriptionMapCache && (now - cacheTimestamp) < CACHE_TTL) {
        console.log('Returning cached subscriptions');
        return {
            subscriptions: subscriptionsCache,
            subscriptionMap: subscriptionMapCache,
        };
    }
    // Fetch fresh data
    const subscriptions = await queryResourceGraph(queries.subscriptions, subscriptionIds);
    const subscriptionMap = new Map(subscriptions.map(sub => [sub.subscriptionId, sub.name]));
    // Update cache
    subscriptionsCache = subscriptions;
    subscriptionMapCache = subscriptionMap;
    cacheTimestamp = now;
    console.log(`Cached ${subscriptions.length} subscriptions`);
    return { subscriptions, subscriptionMap };
}
export function clearSubscriptionsCache() {
    subscriptionsCache = null;
    subscriptionMapCache = null;
    cacheTimestamp = 0;
}
//# sourceMappingURL=dataService.js.map