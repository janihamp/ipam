// =============================================================================
// Azure IPAM - Bicep Infrastructure Template
// Deploys: AKS, ACR, Key Vault, Managed Identities
// =============================================================================

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param baseName string = 'azure-ipam'

@description('AKS cluster node count')
@minValue(1)
@maxValue(10)
param nodeCount int = 2

@description('AKS node VM size')
param nodeVmSize string = 'Standard_DS2_v2'

@description('Enable cluster autoscaler')
param enableAutoscaler bool = true

@minValue(1)
param minNodeCount int = 1

@maxValue(10)
param maxNodeCount int = 5

// Generate unique suffix for globally unique names
var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = 'acr${replace(baseName, '-', '')}${uniqueSuffix}'
var aksName = 'aks-${baseName}'
var keyVaultName = 'kv-${baseName}-${uniqueSuffix}'
var logAnalyticsName = 'log-${baseName}'

// =============================================================================
// Log Analytics Workspace
// =============================================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// =============================================================================
// Azure Container Registry
// =============================================================================
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

// =============================================================================
// User Assigned Managed Identity for AKS
// =============================================================================
resource aksIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${aksName}-identity'
  location: location
}

// =============================================================================
// Azure Kubernetes Service
// =============================================================================
resource aks 'Microsoft.ContainerService/managedClusters@2024-01-01' = {
  name: aksName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${aksIdentity.id}': {}
    }
  }
  properties: {
    dnsPrefix: aksName
    kubernetesVersion: '1.28'
    enableRBAC: true
    
    agentPoolProfiles: [
      {
        name: 'nodepool1'
        count: nodeCount
        vmSize: nodeVmSize
        osType: 'Linux'
        mode: 'System'
        enableAutoScaling: enableAutoscaler
        minCount: enableAutoscaler ? minNodeCount : null
        maxCount: enableAutoscaler ? maxNodeCount : null
      }
    ]
    
    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'azure'
      loadBalancerSku: 'standard'
    }
    
    addonProfiles: {
      omsAgent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalytics.id
        }
      }
      azureKeyvaultSecretsProvider: {
        enabled: true
        config: {
          enableSecretRotation: 'true'
          rotationPollInterval: '2m'
        }
      }
    }
    
    securityProfile: {
      defender: {
        logAnalyticsWorkspaceResourceId: logAnalytics.id
        securityMonitoring: {
          enabled: true
        }
      }
    }
  }
}

// =============================================================================
// ACR Pull Role Assignment for AKS
// =============================================================================
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, aksIdentity.id, acrPullRoleId)
  scope: acr
  properties: {
    principalId: aks.properties.identityProfile.kubeletidentity.objectId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalType: 'ServicePrincipal'
  }
}

// =============================================================================
// Key Vault
// =============================================================================
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    publicNetworkAccess: 'Enabled'
  }
}

// Key Vault Secrets User role for AKS secrets provider
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, aksIdentity.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: aks.properties.addonProfiles.azureKeyvaultSecretsProvider.identity.objectId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

// =============================================================================
// Outputs
// =============================================================================
output aksName string = aks.name
output aksResourceGroup string = resourceGroup().name
output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output kubeletIdentityObjectId string = aks.properties.identityProfile.kubeletidentity.objectId
output secretsProviderIdentityClientId string = aks.properties.addonProfiles.azureKeyvaultSecretsProvider.identity.clientId

output deploymentInfo object = {
  aksClusterName: aks.name
  aksResourceId: aks.id
  acrLoginServer: acr.properties.loginServer
  keyVaultName: keyVault.name
  getCredentials: 'az aks get-credentials --resource-group ${resourceGroup().name} --name ${aks.name}'
  acrLogin: 'az acr login --name ${acr.name}'
}
