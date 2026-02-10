// Azure Resource Graph KQL Queries for IPAM

export const queries = {
  // Get all public IP addresses with their associations
  publicIPAddresses: `
    Resources
    | where type =~ 'microsoft.network/publicipaddresses'
    | extend ipAddress = properties.ipAddress
    | extend allocationMethod = properties.publicIPAllocationMethod
    | extend sku = sku.name
    | extend version = properties.publicIPAddressVersion
    | extend associatedResourceId = properties.ipConfiguration.id
    | extend dnsName = properties.dnsSettings.fqdn
    | project id, name, location, resourceGroup, subscriptionId, 
              ipAddress, allocationMethod, sku, version, associatedResourceId, dnsName, tags
  `,

  // Get all network interfaces with their private IP configurations
  networkInterfaces: `
    Resources
    | where type =~ 'microsoft.network/networkinterfaces'
    | mv-expand ipconfig = properties.ipConfigurations
    | project nicId = id, nicName = name, resourceGroup, location, subscriptionId,
              privateIP = ipconfig.properties.privateIPAddress,
              allocationMethod = ipconfig.properties.privateIPAllocationMethod,
              subnetId = ipconfig.properties.subnet.id,
              publicIpId = ipconfig.properties.publicIPAddress.id,
              vmId = properties.virtualMachine.id,
              isPrimary = ipconfig.properties.primary
  `,

  // Get all virtual networks with their address spaces
  virtualNetworks: `
    Resources
    | where type =~ 'microsoft.network/virtualnetworks'
    | mv-expand addressPrefix = properties.addressSpace.addressPrefixes
    | project id, name, location, resourceGroup, subscriptionId,
              addressPrefix = tostring(addressPrefix),
              dnsServers = properties.dhcpOptions.dnsServers,
              enableDdosProtection = properties.enableDdosProtection,
              tags
  `,

  // Get all subnets with their configurations
  subnets: `
    Resources
    | where type =~ 'microsoft.network/virtualnetworks'
    | mv-expand subnet = properties.subnets
    | project vnetId = id, vnetName = name, location, resourceGroup, subscriptionId,
              subnetId = tostring(subnet.id),
              subnetName = tostring(subnet.name),
              addressPrefix = tostring(subnet.properties.addressPrefix),
              ipConfigCount = array_length(subnet.properties.ipConfigurations),
              delegations = subnet.properties.delegations,
              nsgId = subnet.properties.networkSecurityGroup.id,
              routeTableId = subnet.properties.routeTable.id
  `,

  // Get virtual machines for resource association
  virtualMachines: `
    Resources
    | where type =~ 'microsoft.compute/virtualmachines'
    | project id, name, location, resourceGroup, subscriptionId
  `,

  // Get load balancers
  loadBalancers: `
    Resources
    | where type =~ 'microsoft.network/loadbalancers'
    | project id, name, location, resourceGroup, subscriptionId, sku = sku.name
  `,

  // Get application gateways
  applicationGateways: `
    Resources
    | where type =~ 'microsoft.network/applicationgateways'
    | project id, name, location, resourceGroup, subscriptionId
  `,

  // Get all subscriptions
  subscriptions: `
    ResourceContainers
    | where type =~ 'microsoft.resources/subscriptions'
    | project subscriptionId, name = name, state = properties.state
  `,
}

// Helper to extract resource name from resource ID
export function extractResourceName(resourceId: string | null): string | null {
  if (!resourceId) return null
  const parts = resourceId.split('/')
  return parts[parts.length - 1] || null
}

// Helper to extract resource type from resource ID
export function extractResourceType(resourceId: string | null): string | null {
  if (!resourceId) return null
  
  // Find the provider section and extract resource type
  const providerIndex = resourceId.indexOf('/providers/')
  if (providerIndex === -1) return null
  
  const afterProvider = resourceId.slice(providerIndex + 11)
  const parts = afterProvider.split('/')
  
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`
  }
  return null
}
