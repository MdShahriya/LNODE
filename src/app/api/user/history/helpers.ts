// Helper functions for history data processing

// Type definitions for aggregation data
interface GroupingId {
  year: number;
  month: number;
  day?: number;
  hour?: number;
  week?: number;
}

interface PointsAggregationItem {
  _id: GroupingId;
  totalPoints: number;
  totalBasePoints: number;
  totalBonusPoints: number;
  transactionCount: number;
  creditTransactions: number;
  debitTransactions: number;
  sources: string[];
  avgMultiplier: number;
  maxPoints: number;
  minPoints: number;
  firstTransaction: Date;
  lastTransaction: Date;
}

interface ConnectionAggregationItem {
  _id: GroupingId;
  totalSessions: number;
  uniqueSessionCount: number;
  totalUptime: number;
  totalSessionDuration: number;
  avgSessionDuration: number;
  totalPointsEarned: number;
  connectionTypes: string[];
  activityTypes: string[];
  deviceTypes: string[];
  uniqueIPs: string[];
  totalErrors: number;
  totalWarnings: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgNetworkLatency: number;
  networkTypes: string[];
  effectiveTypes: string[];
  countries: string[];
  regions: string[];
  cities: string[];
  firstConnection: Date;
  lastConnection: Date;
}

interface ProcessedPointsData {
  date: string;
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  transactionCount: number;
  creditTransactions: number;
  debitTransactions: number;
  sources: string[];
  avgMultiplier: number;
  maxPoints: number;
  minPoints: number;
  timestamp: Date;
}

interface ProcessedConnectionData {
  date: string;
  totalSessions: number;
  uniqueSessions: number;
  totalUptime: number;
  totalSessionDuration: number;
  avgSessionDuration: number;
  totalPointsEarned: number;
  connectionTypes: string[];
  activityTypes: string[];
  deviceTypes: string[];
  uniqueIPs: number;
  totalErrors: number;
  totalWarnings: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgNetworkLatency: number;
  networkTypes: string[];
  effectiveTypes: string[];
  countries: string[];
  regions: string[];
  cities: string[];
  timestamp: Date;
}

// Get MongoDB grouping expression based on granularity
export function getGroupingId(granularity: string) {
  switch (granularity) {
    case 'hourly':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
    case 'weekly':
      return {
        year: { $year: '$timestamp' },
        week: { $week: '$timestamp' }
      };
    case 'monthly':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
    default: // daily
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
  }
}

// Process points aggregation data for chart display
export function processPointsAggregationForChart(
  aggregation: PointsAggregationItem[],
  startDate: Date,
  endDate: Date,
  granularity: string
): ProcessedPointsData[] {
  const processedData: ProcessedPointsData[] = [];
  const dataMap = new Map<string, ProcessedPointsData>();
  
  // Create map from aggregation results
  aggregation.forEach(item => {
    const key = createDateKey(item._id, granularity);
    dataMap.set(key, {
      date: key,
      totalPoints: item.totalPoints || 0,
      basePoints: item.totalBasePoints || 0,
      bonusPoints: item.totalBonusPoints || 0,
      transactionCount: item.transactionCount || 0,
      creditTransactions: item.creditTransactions || 0,
      debitTransactions: item.debitTransactions || 0,
      sources: item.sources || [],
      avgMultiplier: item.avgMultiplier || 1,
      maxPoints: item.maxPoints || 0,
      minPoints: item.minPoints || 0,
      timestamp: createTimestamp(item._id, granularity)
    });
  });
  
  // Fill in missing dates with zero values
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = formatDateForGranularity(current, granularity);
    
    if (dataMap.has(key)) {
      processedData.push(dataMap.get(key)!);
    } else {
      processedData.push({
        date: key,
        totalPoints: 0,
        basePoints: 0,
        bonusPoints: 0,
        transactionCount: 0,
        creditTransactions: 0,
        debitTransactions: 0,
        sources: [],
        avgMultiplier: 1,
        maxPoints: 0,
        minPoints: 0,
        timestamp: new Date(current)
      });
    }
    
    incrementDate(current, granularity);
  }
  
  return processedData;
}

// Process connections aggregation data for chart display
export function processConnectionAggregationForChart(
  aggregation: ConnectionAggregationItem[],
  startDate: Date,
  endDate: Date,
  granularity: string
): ProcessedConnectionData[] {
  const processedData: ProcessedConnectionData[] = [];
  const dataMap = new Map<string, ProcessedConnectionData>();
  
  // Create map from aggregation results
  aggregation.forEach(item => {
    const key = createDateKey(item._id, granularity);
    dataMap.set(key, {
      date: key,
      totalSessions: item.totalSessions || 0,
      uniqueSessions: item.uniqueSessionCount || 0,
      totalUptime: item.totalUptime || 0,
      totalSessionDuration: item.totalSessionDuration || 0,
      avgSessionDuration: item.avgSessionDuration || 0,
      totalPointsEarned: item.totalPointsEarned || 0,
      connectionTypes: item.connectionTypes || [],
      activityTypes: item.activityTypes || [],
      deviceTypes: item.deviceTypes || [],
      uniqueIPs: item.uniqueIPs?.length || 0,
      totalErrors: item.totalErrors || 0,
      totalWarnings: item.totalWarnings || 0,
      avgCpuUsage: item.avgCpuUsage || 0,
      avgMemoryUsage: item.avgMemoryUsage || 0,
      avgNetworkLatency: item.avgNetworkLatency || 0,
      networkTypes: item.networkTypes || [],
      effectiveTypes: item.effectiveTypes || [],
      countries: item.countries || [],
      regions: item.regions || [],
      cities: item.cities || [],
      timestamp: createTimestamp(item._id, granularity)
    });
  });
  
  // Fill in missing dates with zero values
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = formatDateForGranularity(current, granularity);
    
    if (dataMap.has(key)) {
      processedData.push(dataMap.get(key)!);
    } else {
      processedData.push({
        date: key,
        totalSessions: 0,
        uniqueSessions: 0,
        totalUptime: 0,
        totalSessionDuration: 0,
        avgSessionDuration: 0,
        totalPointsEarned: 0,
        connectionTypes: [],
        activityTypes: [],
        deviceTypes: [],
        uniqueIPs: 0,
        totalErrors: 0,
        totalWarnings: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        avgNetworkLatency: 0,
        networkTypes: [],
        effectiveTypes: [],
        countries: [],
        regions: [],
        cities: [],
        timestamp: new Date(current)
      });
    }
    
    incrementDate(current, granularity);
  }
  
  return processedData;
}

// Calculate summary statistics for points data
export function calculatePointsSummary(aggregation: PointsAggregationItem[]) {
  if (aggregation.length === 0) {
    return {
      totalPoints: 0,
      totalBasePoints: 0,
      totalBonusPoints: 0,
      totalTransactions: 0,
      avgPointsPerTransaction: 0,
      avgMultiplier: 1,
      topSources: [],
      creditDebitRatio: 0
    };
  }
  
  const totals = aggregation.reduce((acc, item) => {
    acc.totalPoints += item.totalPoints || 0;
    acc.totalBasePoints += item.totalBasePoints || 0;
    acc.totalBonusPoints += item.totalBonusPoints || 0;
    acc.totalTransactions += item.transactionCount || 0;
    acc.creditTransactions += item.creditTransactions || 0;
    acc.debitTransactions += item.debitTransactions || 0;
    acc.multiplierSum += (item.avgMultiplier || 1) * (item.transactionCount || 0);
    
    // Collect all sources
    (item.sources || []).forEach((source: string) => {
      acc.sources[source] = (acc.sources[source] || 0) + (item.totalPoints || 0);
    });
    
    return acc;
  }, {
    totalPoints: 0,
    totalBasePoints: 0,
    totalBonusPoints: 0,
    totalTransactions: 0,
    creditTransactions: 0,
    debitTransactions: 0,
    multiplierSum: 0,
    sources: {} as Record<string, number>
  });
  
  // Calculate top sources
  const topSources = Object.entries(totals.sources)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([source, points]) => ({ source, points }));
  
  return {
    totalPoints: totals.totalPoints,
    totalBasePoints: totals.totalBasePoints,
    totalBonusPoints: totals.totalBonusPoints,
    totalTransactions: totals.totalTransactions,
    avgPointsPerTransaction: totals.totalTransactions > 0 ? 
      totals.totalPoints / totals.totalTransactions : 0,
    avgMultiplier: totals.totalTransactions > 0 ? 
      totals.multiplierSum / totals.totalTransactions : 1,
    topSources,
    creditDebitRatio: totals.debitTransactions > 0 ? 
      totals.creditTransactions / totals.debitTransactions : 
      (totals.creditTransactions > 0 ? Infinity : 0)
  };
}

// Calculate summary statistics for connections data
export function calculateConnectionsSummary(aggregation: ConnectionAggregationItem[]) {
  if (aggregation.length === 0) {
    return {
      totalSessions: 0,
      totalUniqueIPs: 0,
      totalUptime: 0,
      avgSessionDuration: 0,
      totalPointsEarned: 0,
      totalErrors: 0,
      totalWarnings: 0,
      avgPerformance: { cpu: 0, memory: 0, network: 0 },
      topDeviceTypes: [],
      topLocations: []
    };
  }
  
  const totals = aggregation.reduce((acc, item) => {
    acc.totalSessions += item.totalSessions || 0;
    acc.totalUptime += item.totalUptime || 0;
    acc.totalSessionDuration += item.totalSessionDuration || 0;
    acc.totalPointsEarned += item.totalPointsEarned || 0;
    acc.totalErrors += item.totalErrors || 0;
    acc.totalWarnings += item.totalWarnings || 0;
    
    // Performance metrics
    if (item.avgCpuUsage) {
      acc.cpuSum += item.avgCpuUsage * (item.totalSessions || 0);
      acc.cpuCount += item.totalSessions || 0;
    }
    if (item.avgMemoryUsage) {
      acc.memorySum += item.avgMemoryUsage * (item.totalSessions || 0);
      acc.memoryCount += item.totalSessions || 0;
    }
    if (item.avgNetworkLatency) {
      acc.networkSum += item.avgNetworkLatency * (item.totalSessions || 0);
      acc.networkCount += item.totalSessions || 0;
    }
    
    // Collect unique IPs
    (item.uniqueIPs || []).forEach((ip: string) => {
      acc.uniqueIPs.add(ip);
    });
    
    // Device types
    (item.deviceTypes || []).forEach((type: string) => {
      acc.deviceTypes[type] = (acc.deviceTypes[type] || 0) + (item.totalSessions || 0);
    });
    
    // Locations
    (item.countries || []).forEach((country: string) => {
      if (country && country !== 'unknown') {
        acc.locations[country] = (acc.locations[country] || 0) + (item.totalSessions || 0);
      }
    });
    
    return acc;
  }, {
    totalSessions: 0,
    totalUptime: 0,
    totalSessionDuration: 0,
    totalPointsEarned: 0,
    totalErrors: 0,
    totalWarnings: 0,
    cpuSum: 0,
    cpuCount: 0,
    memorySum: 0,
    memoryCount: 0,
    networkSum: 0,
    networkCount: 0,
    uniqueIPs: new Set(),
    deviceTypes: {} as Record<string, number>,
    locations: {} as Record<string, number>
  });
  
  // Calculate top device types and locations
  const topDeviceTypes = Object.entries(totals.deviceTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
    
  const topLocations = Object.entries(totals.locations)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([location, count]) => ({ location, count }));
  
  return {
    totalSessions: totals.totalSessions,
    totalUniqueIPs: totals.uniqueIPs.size,
    totalUptime: totals.totalUptime,
    avgSessionDuration: totals.totalSessions > 0 ? 
      totals.totalSessionDuration / totals.totalSessions : 0,
    totalPointsEarned: totals.totalPointsEarned,
    totalErrors: totals.totalErrors,
    totalWarnings: totals.totalWarnings,
    avgPerformance: {
      cpu: totals.cpuCount > 0 ? totals.cpuSum / totals.cpuCount : 0,
      memory: totals.memoryCount > 0 ? totals.memorySum / totals.memoryCount : 0,
      network: totals.networkCount > 0 ? totals.networkSum / totals.networkCount : 0
    },
    topDeviceTypes,
    topLocations
  };
}

// Helper functions for date manipulation
function createDateKey(groupId: GroupingId, granularity: string): string {
  switch (granularity) {
    case 'hourly':
      return `${groupId.year}-${String(groupId.month).padStart(2, '0')}-${String(groupId.day!).padStart(2, '0')} ${String(groupId.hour!).padStart(2, '0')}:00`;
    case 'weekly':
      return `${groupId.year}-W${String(groupId.week!).padStart(2, '0')}`;
    case 'monthly':
      return `${groupId.year}-${String(groupId.month).padStart(2, '0')}`;
    default: // daily
      return `${groupId.year}-${String(groupId.month).padStart(2, '0')}-${String(groupId.day!).padStart(2, '0')}`;
  }
}

function createTimestamp(groupId: GroupingId, granularity: string): Date {
  switch (granularity) {
    case 'hourly':
      return new Date(groupId.year, groupId.month - 1, groupId.day!, groupId.hour!);
    case 'weekly':
      // Approximate week start
      const weekStart = new Date(groupId.year, 0, 1);
      weekStart.setDate(weekStart.getDate() + (groupId.week! - 1) * 7);
      return weekStart;
    case 'monthly':
      return new Date(groupId.year, groupId.month - 1, 1);
    default: // daily
      return new Date(groupId.year, groupId.month - 1, groupId.day!);
  }
}

function formatDateForGranularity(date: Date, granularity: string): string {
  switch (granularity) {
    case 'hourly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
    case 'weekly':
      const weekNumber = getWeekNumber(date);
      return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    case 'monthly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default: // daily
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

function incrementDate(date: Date, granularity: string): void {
  switch (granularity) {
    case 'hourly':
      date.setHours(date.getHours() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default: // daily
      date.setDate(date.getDate() + 1);
      break;
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}