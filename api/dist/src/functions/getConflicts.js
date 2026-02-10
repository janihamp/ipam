import { app } from '@azure/functions';
import { queryResourceGraph } from '../shared/azureClient.js';
import { queries } from '../shared/resourceGraphQueries.js';
import { findConflicts } from '../shared/cidrUtils.js';
export async function getConflicts(request, context) {
    context.log('Getting CIDR conflicts...');
    try {
        const subscriptionIds = request.query.get('subscriptions')?.split(',').filter(Boolean);
        // Get all VNets with their address spaces
        const vnets = await queryResourceGraph(queries.virtualNetworks, subscriptionIds);
        // Convert to CIDRRange format
        const ranges = vnets.map(vnet => ({
            id: vnet.id,
            name: vnet.name,
            cidr: vnet.addressPrefix,
            location: vnet.location,
            subscriptionId: vnet.subscriptionId,
            resourceGroup: vnet.resourceGroup,
            type: 'vnet',
        }));
        // Find conflicts
        const conflicts = findConflicts(ranges);
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conflicts),
        };
    }
    catch (error) {
        context.error('Error getting conflicts:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to get conflicts' }),
        };
    }
}
app.http('getConflicts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'conflicts',
    handler: getConflicts,
});
//# sourceMappingURL=getConflicts.js.map