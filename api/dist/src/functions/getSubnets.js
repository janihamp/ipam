import { app } from '@azure/functions';
import { queryResourceGraph } from '../shared/azureClient.js';
import { queries } from '../shared/resourceGraphQueries.js';
import { calculateTotalIPs } from '../shared/cidrUtils.js';
export async function getSubnets(request, context) {
    context.log('Getting subnets...');
    try {
        const subscriptionIds = request.query.get('subscriptions')?.split(',').filter(Boolean);
        // Get subscriptions for name mapping
        const subscriptions = await queryResourceGraph(queries.subscriptions, subscriptionIds);
        const subscriptionMap = new Map(subscriptions.map(sub => [sub.subscriptionId, sub.name]));
        // Get subnets
        const subnetData = await queryResourceGraph(queries.subnets, subscriptionIds);
        // Get NICs to count assigned IPs per subnet (this includes deallocated VMs)
        const nics = await queryResourceGraph(queries.networkInterfaces, subscriptionIds);
        const subnetAssignedIPs = new Map();
        for (const nic of nics) {
            const subnetId = nic.subnetId;
            if (subnetId) {
                subnetAssignedIPs.set(subnetId, (subnetAssignedIPs.get(subnetId) || 0) + 1);
            }
        }
        const subnets = subnetData.map(subnet => {
            const subnetId = subnet.subnetId;
            const addressPrefix = subnet.addressPrefix;
            const totalIPs = calculateTotalIPs(addressPrefix);
            const usedIPs = subnet.ipConfigCount || 0;
            const assignedIPs = subnetAssignedIPs.get(subnetId) || usedIPs;
            const utilizationPercent = totalIPs > 0 ? (usedIPs / totalIPs) * 100 : 0;
            // Extract delegation names
            const delegations = [];
            const delegationData = subnet.delegations;
            if (delegationData && Array.isArray(delegationData)) {
                for (const d of delegationData) {
                    if (d.properties?.serviceName) {
                        delegations.push(d.properties.serviceName);
                    }
                }
            }
            const subscriptionId = subnet.subscriptionId;
            return {
                id: subnetId,
                name: subnet.subnetName,
                vnetId: subnet.vnetId,
                vnetName: subnet.vnetName,
                resourceGroup: subnet.resourceGroup,
                subscriptionId,
                subscriptionName: subscriptionMap.get(subscriptionId) || null,
                location: subnet.location,
                addressPrefix,
                assignedIPs,
                usedIPs,
                totalIPs,
                utilizationPercent: Math.round(utilizationPercent * 10) / 10,
                delegations,
                hasNSG: !!subnet.nsgId,
                hasRouteTable: !!subnet.routeTableId,
                nsgId: subnet.nsgId || null,
                routeTableId: subnet.routeTableId || null,
            };
        });
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subnets),
        };
    }
    catch (error) {
        context.error('Error getting subnets:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to get subnets' }),
        };
    }
}
app.http('getSubnets', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'subnets',
    handler: getSubnets,
});
//# sourceMappingURL=getSubnets.js.map