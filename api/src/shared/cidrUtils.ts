import { Address4, Address6 } from 'ip-address'

export interface CIDRRange {
  id: string
  name: string
  cidr: string
  location: string
  subscriptionId: string
  resourceGroup: string
  type: 'vnet' | 'subnet'
}

export interface Conflict {
  id: string
  severity: 'warning' | 'critical'
  type: 'overlap' | 'subset' | 'superset'
  description: string
  resources: CIDRRange[]
  impact: string
  detectedAt: string
}

// Calculate total usable IPs in a subnet (excluding network and broadcast)
export function calculateTotalIPs(cidr: string): number {
  try {
    if (cidr.includes(':')) {
      // IPv6
      const addr = new Address6(cidr)
      const prefixLength = addr.subnetMask
      // For IPv6, return a reasonable number (Azure usually doesn't use full IPv6 ranges)
      return Math.min(Math.pow(2, 128 - prefixLength), 65534)
    } else {
      // IPv4
      const addr = new Address4(cidr)
      const prefixLength = addr.subnetMask
      // Subtract 5 for Azure reserved addresses (network, gateway, 2x DNS, broadcast)
      return Math.max(0, Math.pow(2, 32 - prefixLength) - 5)
    }
  } catch {
    return 0
  }
}

// Check if two CIDR ranges overlap
export function checkOverlap(cidr1: string, cidr2: string): 'none' | 'overlap' | 'subset' | 'superset' {
  try {
    const isIPv6_1 = cidr1.includes(':')
    const isIPv6_2 = cidr2.includes(':')

    // Different address families can't overlap
    if (isIPv6_1 !== isIPv6_2) return 'none'

    if (isIPv6_1) {
      const addr1 = new Address6(cidr1)
      const addr2 = new Address6(cidr2)
      
      // Check if one is contained in the other using isInSubnet
      if (addr1.isInSubnet(addr2)) return 'subset'
      if (addr2.isInSubnet(addr1)) return 'superset'
      
      // For IPv6, we'll only detect subset/superset relationships
      // Full overlap detection is complex for IPv6
      return 'none'
    } else {
      const addr1 = new Address4(cidr1)
      const addr2 = new Address4(cidr2)
      
      // Check if one is contained in the other
      if (addr1.isInSubnet(addr2)) return 'subset'
      if (addr2.isInSubnet(addr1)) return 'superset'
      
      // Check for partial overlap using start/end addresses
      // Convert to integers for comparison
      const toInt = (addr: Address4) => {
        const parts = addr.toArray()
        return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3]
      }
      
      const start1 = toInt(addr1.startAddress())
      const end1 = toInt(addr1.endAddress())
      const start2 = toInt(addr2.startAddress())
      const end2 = toInt(addr2.endAddress())
      
      if (start1 <= end2 && start2 <= end1) {
        return 'overlap'
      }
    }
    
    return 'none'
  } catch {
    return 'none'
  }
}

// Find all CIDR conflicts among a list of ranges
export function findConflicts(ranges: CIDRRange[]): Conflict[] {
  const conflicts: Conflict[] = []
  const checked = new Set<string>()

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const range1 = ranges[i]
      const range2 = ranges[j]
      
      // Create unique key for this pair
      const pairKey = [range1.id, range2.id].sort().join('|')
      if (checked.has(pairKey)) continue
      checked.add(pairKey)

      const overlapType = checkOverlap(range1.cidr, range2.cidr)
      
      if (overlapType !== 'none') {
        const isSameSubscription = range1.subscriptionId === range2.subscriptionId
        
        conflicts.push({
          id: `conflict-${range1.id}-${range2.id}`.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 64),
          severity: overlapType === 'subset' || overlapType === 'superset' ? 'critical' : 'warning',
          type: overlapType,
          description: getConflictDescription(range1, range2, overlapType),
          resources: [
            {
              id: range1.id,
              name: range1.name,
              cidr: range1.cidr,
              location: range1.location,
              subscriptionId: range1.subscriptionId,
              resourceGroup: range1.resourceGroup,
              type: range1.type,
            },
            {
              id: range2.id,
              name: range2.name,
              cidr: range2.cidr,
              location: range2.location,
              subscriptionId: range2.subscriptionId,
              resourceGroup: range2.resourceGroup,
              type: range2.type,
            },
          ],
          impact: getImpactDescription(overlapType, isSameSubscription),
          detectedAt: new Date().toISOString(),
        })
      }
    }
  }

  return conflicts
}

function getConflictDescription(range1: CIDRRange, range2: CIDRRange, type: string): string {
  switch (type) {
    case 'subset':
      return `${range1.cidr} is completely contained within ${range2.cidr}`
    case 'superset':
      return `${range1.cidr} completely contains ${range2.cidr}`
    case 'overlap':
      return `${range1.cidr} and ${range2.cidr} have overlapping address ranges`
    default:
      return 'Overlapping address spaces detected'
  }
}

function getImpactDescription(type: string, isSameSubscription: boolean): string {
  const base = type === 'subset' || type === 'superset'
    ? 'Cannot peer these VNets; routing conflicts if connected via VPN/ExpressRoute'
    : 'Partial address conflict may cause routing issues if peered or connected'
  
  if (isSameSubscription) {
    return base + '. Resources are in the same subscription - consider re-addressing.'
  }
  return base
}
