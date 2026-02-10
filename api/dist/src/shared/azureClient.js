import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { ResourceGraphClient } from '@azure/arm-resourcegraph';
import { SubscriptionClient } from '@azure/arm-subscriptions';
let subscriptionClient = null;
let resourceGraphClient = null;
const queryCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds
export function getCredential() {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    if (tenantId && clientId && clientSecret) {
        return new ClientSecretCredential(tenantId, clientId, clientSecret);
    }
    return new DefaultAzureCredential();
}
export function getSubscriptionClient() {
    if (!subscriptionClient) {
        const credential = getCredential();
        subscriptionClient = new SubscriptionClient(credential);
    }
    return subscriptionClient;
}
export function getResourceGraphClient() {
    if (!resourceGraphClient) {
        const credential = getCredential();
        resourceGraphClient = new ResourceGraphClient(credential);
    }
    return resourceGraphClient;
}
export async function queryResourceGraph(query, subscriptionIds) {
    // Generate cache key
    const cacheKey = `${query}|${subscriptionIds?.join(',') || 'all'}`;
    // Check cache
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('Returning cached Resource Graph query result');
        return cached.data;
    }
    const client = getResourceGraphClient();
    // Get all subscription IDs if not provided
    if (!subscriptionIds || subscriptionIds.length === 0) {
        const subClient = getSubscriptionClient();
        const subs = [];
        for await (const sub of subClient.subscriptions.list()) {
            if (sub.subscriptionId) {
                subs.push(sub.subscriptionId);
            }
        }
        subscriptionIds = subs;
    }
    try {
        const result = await client.resources({
            query,
            subscriptions: subscriptionIds,
        });
        const data = result.data || [];
        // Cache the result
        queryCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });
        return data;
    }
    catch (error) {
        // If rate limited, try to return stale cache
        if (error.statusCode === 429 && cached) {
            console.warn('Rate limited, returning stale cache');
            return cached.data;
        }
        throw error;
    }
}
// Clear cache function (optional)
export function clearResourceGraphCache() {
    queryCache.clear();
}
//# sourceMappingURL=azureClient.js.map