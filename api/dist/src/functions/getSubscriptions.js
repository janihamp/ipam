import { app } from '@azure/functions';
import { getSubscriptionClient } from '../shared/azureClient.js';
export async function getSubscriptions(request, context) {
    context.log('Getting subscriptions...');
    try {
        const client = getSubscriptionClient();
        const subscriptions = [];
        for await (const sub of client.subscriptions.list()) {
            subscriptions.push({
                id: sub.subscriptionId || '',
                name: sub.displayName || '',
                state: sub.state || '',
            });
        }
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscriptions),
        };
    }
    catch (error) {
        context.error('Error getting subscriptions:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to get subscriptions' }),
        };
    }
}
app.http('getSubscriptions', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'subscriptions',
    handler: getSubscriptions,
});
//# sourceMappingURL=getSubscriptions.js.map