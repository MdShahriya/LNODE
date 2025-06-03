// Helper functions for node session processing

export function calculatePerformanceScore(metrics: {
  cpuUsage?: number;
  memoryUsage?: number;
  networkLatency?: number;
  errorCount?: number;
  warningCount?: number;
}): number {
  let score = 100;
  
  // CPU usage penalty (0-100%)
  if (metrics.cpuUsage !== undefined) {
    if (metrics.cpuUsage > 80) score -= 20;
    else if (metrics.cpuUsage > 60) score -= 10;
    else if (metrics.cpuUsage > 40) score -= 5;
  }
  
  // Memory usage penalty (assuming reasonable limits)
  if (metrics.memoryUsage !== undefined) {
    if (metrics.memoryUsage > 2000) score -= 15; // > 2GB
    else if (metrics.memoryUsage > 1000) score -= 8; // > 1GB
    else if (metrics.memoryUsage > 500) score -= 3; // > 500MB
  }
  
  // Network latency penalty
  if (metrics.networkLatency !== undefined) {
    if (metrics.networkLatency > 500) score -= 25; // > 500ms
    else if (metrics.networkLatency > 200) score -= 15; // > 200ms
    else if (metrics.networkLatency > 100) score -= 8; // > 100ms
    else if (metrics.networkLatency > 50) score -= 3; // > 50ms
  }
  
  // Error and warning penalties
  if (metrics.errorCount && metrics.errorCount > 0) {
    score -= Math.min(metrics.errorCount * 5, 30); // Max 30 point penalty
  }
  
  if (metrics.warningCount && metrics.warningCount > 0) {
    score -= Math.min(metrics.warningCount * 2, 15); // Max 15 point penalty
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function determineNodeQuality(
  performanceScore: number,
  uptimeHours: number,
  errorCount: number
): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (performanceScore >= 95 && uptimeHours >= 100 && errorCount === 0) {
    return 'diamond';
  } else if (performanceScore >= 90 && uptimeHours >= 50 && errorCount <= 1) {
    return 'platinum';
  } else if (performanceScore >= 80 && uptimeHours >= 20 && errorCount <= 3) {
    return 'gold';
  } else if (performanceScore >= 70 && uptimeHours >= 5 && errorCount <= 5) {
    return 'silver';
  } else {
    return 'bronze';
  }
}

export function getQualityMultiplier(
  quality: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
): number {
  const multipliers = {
    bronze: 1.0,
    silver: 1.2,
    gold: 1.5,
    platinum: 2.0,
    diamond: 3.0
  };
  return multipliers[quality];
}

export function getStatusIcon(
  isRunning: boolean,
  hasActiveActivity: boolean,
  performanceScore: number
): string {
  if (!isRunning) return '🔴';
  
  if (performanceScore >= 90) return '🟢';
  if (performanceScore >= 70) return '🟡';
  if (performanceScore >= 50) return '🟠';
  return '🔴';
}

export function determineNodeType(
  deviceInfo: string,
  deviceType: string
): string {
  if (deviceInfo.toLowerCase().includes('extension')) {
    return 'Extension Node';
  }
  
  switch (deviceType) {
    case 'mobile':
      return 'Mobile Node';
    case 'tablet':
      return 'Tablet Node';
    case 'desktop':
      return 'Desktop Node';
    default:
      return 'Standard Node';
  }
}

export function formatLocation(location: {
  country?: string;
  region?: string;
  city?: string;
}): string {
  const parts = [];
  if (location.city) parts.push(location.city);
  if (location.region && (!location.city || location.region !== location.city)) parts.push(location.region);
  if (location.country) parts.push(location.country);
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown';
}

export interface ProcessedNodeSession {
  sessionId: string;
  deviceIP: string;
  deviceInfo?: string;
  browser?: string;
  platform?: string;
  deviceType?: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  uptime: number;
  sessionDuration: number;
  pointsEarned: number;
  lastHeartbeat?: Date;
  errorCount: number;
  warningCount: number;
  performanceScore: number;
  nodeQuality: string;
  nodeType: string;
  location: string;
  statusIcon: string;
  performanceMetrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  networkInfo?: {
    connectionTypes: string[];
    effectiveTypes: string[];
  };
  geolocation?: {
    countries: string[];
    regions: string[];
    cities: string[];
  };
}

export function calculateQualityDistribution(sessions: ProcessedNodeSession[]): Record<string, number> {
  const distribution: Record<string, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    diamond: 0
  };
  
  sessions.forEach(session => {
    if (session.nodeQuality && distribution[session.nodeQuality] !== undefined) {
      distribution[session.nodeQuality]++;
    } else {
      distribution.bronze++;
    }
  });
  
  return distribution;
}

export function calculateNodeStatistics(sessions: ProcessedNodeSession[]) {
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const totalUptime = sessions.reduce((sum, s) => sum + (s.uptime || 0), 0);
  const totalPoints = sessions.reduce((sum, s) => sum + (s.pointsEarned || 0), 0);
  const avgSessionDuration = totalSessions > 0 
    ? sessions.reduce((sum, s) => sum + s.sessionDuration, 0) / totalSessions 
    : 0;
  const avgPerformanceScore = totalSessions > 0
    ? sessions.reduce((sum, s) => sum + s.performanceScore, 0) / totalSessions
    : 0;

  return {
    totalSessions,
    activeSessions,
    totalUptime,
    totalPoints,
    avgSessionDuration,
    avgPerformanceScore,
    nodeQualityDistribution: calculateQualityDistribution(sessions)
  };
}