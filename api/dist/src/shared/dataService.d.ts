interface Subscription {
    subscriptionId: string;
    name: string;
    state: string;
}
export declare function getSubscriptionsWithCache(subscriptionIds?: string[]): Promise<{
    subscriptions: Subscription[];
    subscriptionMap: Map<string, string>;
}>;
export declare function clearSubscriptionsCache(): void;
export {};
//# sourceMappingURL=dataService.d.ts.map