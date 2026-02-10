export interface CIDRRange {
    id: string;
    name: string;
    cidr: string;
    location: string;
    subscriptionId: string;
    resourceGroup: string;
    type: 'vnet' | 'subnet';
}
export interface Conflict {
    id: string;
    severity: 'warning' | 'critical';
    type: 'overlap' | 'subset' | 'superset';
    description: string;
    resources: CIDRRange[];
    impact: string;
    detectedAt: string;
}
export declare function calculateTotalIPs(cidr: string): number;
export declare function checkOverlap(cidr1: string, cidr2: string): 'none' | 'overlap' | 'subset' | 'superset';
export declare function findConflicts(ranges: CIDRRange[]): Conflict[];
//# sourceMappingURL=cidrUtils.d.ts.map