import { app } from '@azure/functions';
import { queryResourceGraph } from '../shared/azureClient.js';
import { queries, extractResourceName, extractResourceType } from '../shared/resourceGraphQueries.js';
export async function getIPAddresses(request, context) {
    context.log('Getting IP addresses...');
    try {
        const subscriptionIds = request.query.get('subscriptions')?.split(',').filter(Boolean);
        // Get subscriptions for name mapping
        const subscriptions = await queryResourceGraph(queries.subscriptions, subscriptionIds);
        const subscriptionMap = new Map(subscriptions.map(sub => [sub.subscriptionId, sub.name]));
        // Get public IPs
        const publicIPs = await queryResourceGraph(queries.publicIPAddresses, subscriptionIds);
        // Get private IPs from NICs
        const nics = await queryResourceGraph(queries.networkInterfaces, subscriptionIds);
        // Get VMs for resource name mapping
        const vms = await queryResourceGraph(queries.virtualMachines, subscriptionIds);
        const vmMap = new Map(vms.map(vm => [vm.id, vm.name]));
        // Get Load Balancers for resource name mapping
        const lbs = await queryResourceGraph(queries.loadBalancers, subscriptionIds);
        const lbMap = new Map(lbs.map(lb => [lb.id, lb.name]));
        // Get Application Gateways for resource name mapping
        const appGws = await queryResourceGraph(queries.applicationGateways, subscriptionIds);
        const appGwMap = new Map(appGws.map(gw => [gw.id, gw.name]));
        // Build NIC to VM mapping
        const nicToVmMap = new Map();
        for (const nic of nics) {
            const nicId = nic.nicId;
            const vmId = nic.vmId;
            if (vmId && nicId) {
                const vmName = vmMap.get(vmId);
                if (vmName) {
                    nicToVmMap.set(nicId, vmName);
                }
            }
        }
        const ipAddresses = [];
        // Process public IPs
        for (const pip of publicIPs) {
            const associatedId = pip.associatedResourceId;
            let associatedResource = null;
            let associatedResourceType = null;
            if (associatedId) {
                // Parse the associated resource ID to determine the resource type
                // Format: /subscriptions/.../providers/Microsoft.Network/networkInterfaces/{nicName}/ipConfigurations/{configName}
                // Or: /subscriptions/.../providers/Microsoft.Network/loadBalancers/{lbName}/frontendIPConfigurations/{configName}
                // Or: /subscriptions/.../providers/Microsoft.Network/applicationGateways/{gwName}/...
                if (associatedId.includes('/networkInterfaces/')) {
                    // Extract NIC ID and look up the VM
                    const nicIdMatch = associatedId.match(/(.+\/networkInterfaces\/[^/]+)/);
                    if (nicIdMatch) {
                        const nicId = nicIdMatch[1];
                        associatedResource = nicToVmMap.get(nicId) || extractNicName(associatedId);
                        associatedResourceType = nicToVmMap.get(nicId)
                            ? 'Microsoft.Compute/virtualMachines'
                            : 'Microsoft.Network/networkInterfaces';
                    }
                }
                else if (associatedId.includes('/loadBalancers/')) {
                    // Extract Load Balancer name
                    const lbMatch = associatedId.match(/\/loadBalancers\/([^/]+)/);
                    if (lbMatch) {
                        associatedResource = lbMatch[1];
                        associatedResourceType = 'Microsoft.Network/loadBalancers';
                    }
                }
                else if (associatedId.includes('/applicationGateways/')) {
                    // Extract Application Gateway name
                    const gwMatch = associatedId.match(/\/applicationGateways\/([^/]+)/);
                    if (gwMatch) {
                        associatedResource = gwMatch[1];
                        associatedResourceType = 'Microsoft.Network/applicationGateways';
                    }
                }
                else if (associatedId.includes('/bastionHosts/')) {
                    const bastionMatch = associatedId.match(/\/bastionHosts\/([^/]+)/);
                    if (bastionMatch) {
                        associatedResource = bastionMatch[1];
                        associatedResourceType = 'Microsoft.Network/bastionHosts';
                    }
                }
                else if (associatedId.includes('/azureFirewalls/')) {
                    const fwMatch = associatedId.match(/\/azureFirewalls\/([^/]+)/);
                    if (fwMatch) {
                        associatedResource = fwMatch[1];
                        associatedResourceType = 'Microsoft.Network/azureFirewalls';
                    }
                }
                else if (associatedId.includes('/natGateways/')) {
                    const natMatch = associatedId.match(/\/natGateways\/([^/]+)/);
                    if (natMatch) {
                        associatedResource = natMatch[1];
                        associatedResourceType = 'Microsoft.Network/natGateways';
                    }
                }
                else {
                    associatedResource = extractResourceName(associatedId);
                    associatedResourceType = extractResourceType(associatedId);
                }
            }
            const pipSubscriptionId = pip.subscriptionId;
            ipAddresses.push({
                id: pip.id,
                ipAddress: pip.ipAddress,
                type: 'Public',
                allocationMethod: pip.allocationMethod,
                resourceGroup: pip.resourceGroup,
                subscriptionId: pipSubscriptionId,
                subscriptionName: subscriptionMap.get(pipSubscriptionId) || null,
                location: pip.location,
                associatedResource,
                associatedResourceType,
                sku: pip.sku,
            });
        }
        // Process private IPs from NICs
        for (const nic of nics) {
            const subnetId = nic.subnetId;
            const vmId = nic.vmId;
            const nicName = nic.nicName;
            // Parse subnet and vnet from subnetId
            let subnetName;
            let vnetName;
            if (subnetId) {
                const parts = subnetId.split('/');
                subnetName = parts[parts.length - 1];
                const vnetIndex = parts.indexOf('virtualNetworks');
                if (vnetIndex !== -1) {
                    vnetName = parts[vnetIndex + 1];
                }
            }
            // Get VM name or use NIC name as fallback
            const vmName = vmId ? vmMap.get(vmId) : null;
            const associatedResource = vmName || nicName;
            const associatedResourceType = vmName
                ? 'Microsoft.Compute/virtualMachines'
                : 'Microsoft.Network/networkInterfaces';
            const nicSubscriptionId = nic.subscriptionId;
            ipAddresses.push({
                id: nic.nicId,
                ipAddress: nic.privateIP,
                type: 'Private',
                allocationMethod: nic.allocationMethod,
                resourceGroup: nic.resourceGroup,
                subscriptionId: nicSubscriptionId,
                subscriptionName: subscriptionMap.get(nicSubscriptionId) || null,
                location: nic.location,
                associatedResource,
                associatedResourceType,
                subnet: subnetName,
                vnet: vnetName,
            });
        }
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ipAddresses),
        };
    }
    catch (error) {
        context.error('Error getting IP addresses:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to get IP addresses' }),
        };
    }
}
// Helper to extract NIC name from IP configuration ID
function extractNicName(ipConfigId) {
    const match = ipConfigId.match(/\/networkInterfaces\/([^/]+)/);
    return match ? match[1] : 'Unknown';
}
app.http('getIPAddresses', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ip-addresses',
    handler: getIPAddresses,
});
//# sourceMappingURL=getIPAddresses.js.map