import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { ResourceGraphClient } from '@azure/arm-resourcegraph';
import { SubscriptionClient } from '@azure/arm-subscriptions';
export declare function getCredential(): ClientSecretCredential | DefaultAzureCredential;
export declare function getSubscriptionClient(): SubscriptionClient;
export declare function getResourceGraphClient(): ResourceGraphClient;
export declare function queryResourceGraph(query: string, subscriptionIds?: string[]): Promise<any[]>;
export declare function clearResourceGraphCache(): void;
//# sourceMappingURL=azureClient.d.ts.map