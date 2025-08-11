interface MetricData {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

interface PerformanceMetrics {
  redirectLatencyP50: number;
  redirectLatencyP95: number;
  redirectLatencyP99: number;
  failOpenRate: number;
  backgroundSuccessRate: number;
  geoVerificationSuccessRate: number;
  totalRequests: number;
  requestsPerMinute: number;
}

interface DetailedMetrics extends PerformanceMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  cacheHitRate: number;
  geoProviderStats: {
    maxmind: { requests: number; successRate: number; avgLatency: number };
    ip2location: { requests: number; successRate: number; avgLatency: number };
    ipgeolocation: { requests: number; successRate: number; avgLatency: number };
  };
}

class MetricsService {
  private metrics: Map<string, MetricData[]> = new Map();
  private readonly maxDataPoints = 1000; // Keep last 1000 data points per metric
  private readonly startTime = Date.now();

  constructor() {
    // Initialize metric storage
    this.initializeMetrics();
    
    // Start background cleanup
    setInterval(() => this.cleanupOldMetrics(), 60000); // Every minute
  }

  /**
   * Record redirect latency (critical metric for <200ms SLA)
   */
  recordRedirectLatency(latencyMs: number, labels?: Record<string, string>): void {
    this.addMetric('redirect_latency_ms', latencyMs, labels);
  }

  /**
   * Record fail-open event
   */
  recordFailOpen(reason: string, latencyMs?: number): void {
    this.addMetric('fail_open_count', 1, { reason });
    if (latencyMs) {
      this.addMetric('fail_open_latency_ms', latencyMs, { reason });
    }
  }

  /**
   * Record background verification success/failure
   */
  recordBackgroundVerification(success: boolean, retryAttempt: number): void {
    this.addMetric('background_verification', success ? 1 : 0, { 
      retry_attempt: retryAttempt.toString() 
    });
  }

  /**
   * Record geo-location provider performance
   */
  recordGeoProviderLatency(provider: string, latencyMs: number, success: boolean): void {
    this.addMetric('geo_provider_latency_ms', latencyMs, { provider });
    this.addMetric('geo_provider_success', success ? 1 : 0, { provider });
  }

  /**
   * Record cache hit/miss
   */
  recordCacheOperation(operation: 'hit' | 'miss' | 'set', key: string): void {
    this.addMetric('cache_operations', 1, { operation, key_type: this.getKeyType(key) });
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.addMetric('http_requests_total', 1, { method, path, status: statusCode.toString() });
    this.addMetric('http_request_duration_ms', duration, { method, path });
  }

  /**
   * Get current performance metrics (for SLA monitoring)
   */
  async getMetrics(): Promise<DetailedMetrics> {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5-minute window for calculations

    // Calculate latency percentiles
    const latencies = this.getMetricValues('redirect_latency_ms', windowMs);
    const sortedLatencies = latencies.sort((a, b) => a - b);
    
    const p50 = this.calculatePercentile(sortedLatencies, 0.5);
    const p95 = this.calculatePercentile(sortedLatencies, 0.95);
    const p99 = this.calculatePercentile(sortedLatencies, 0.99);

    // Calculate fail-open rate
    const totalRequests = this.getMetricValues('http_requests_total', windowMs).length;
    const failOpenCount = this.getMetricValues('fail_open_count', windowMs).length;
    const failOpenRate = totalRequests > 0 ? (failOpenCount / totalRequests) * 100 : 0;

    // Calculate background success rate
    const backgroundAttempts = this.getMetricValues('background_verification', windowMs);
    const backgroundSuccesses = backgroundAttempts.filter(v => v === 1).length;
    const backgroundSuccessRate = backgroundAttempts.length > 0 
      ? (backgroundSuccesses / backgroundAttempts.length) * 100 
      : 100;

    // Calculate geo verification success rate
    const geoSuccesses = this.getMetricValues('geo_provider_success', windowMs);
    const geoSuccessCount = geoSuccesses.filter(v => v === 1).length;
    const geoVerificationSuccessRate = geoSuccesses.length > 0 
      ? (geoSuccessCount / geoSuccesses.length) * 100 
      : 100;

    // Calculate cache hit rate
    const cacheHits = this.getMetricValues('cache_operations', windowMs, { operation: 'hit' }).length;
    const cacheMisses = this.getMetricValues('cache_operations', windowMs, { operation: 'miss' }).length;
    const cacheHitRate = (cacheHits + cacheMisses) > 0 
      ? (cacheHits / (cacheHits + cacheMisses)) * 100 
      : 0;

    // Calculate requests per minute
    const requestsPerMinute = totalRequests * (60000 / windowMs);

    // Get geo provider stats
    const geoProviderStats = {
      maxmind: this.getGeoProviderStats('maxmind', windowMs),
      ip2location: this.getGeoProviderStats('ip2location', windowMs),
      ipgeolocation: this.getGeoProviderStats('ipgeolocation', windowMs)
    };

    return {
      redirectLatencyP50: p50,
      redirectLatencyP95: p95,
      redirectLatencyP99: p99,
      failOpenRate,
      backgroundSuccessRate,
      geoVerificationSuccessRate,
      totalRequests,
      requestsPerMinute,
      uptime: now - this.startTime,
      memoryUsage: process.memoryUsage(),
      activeConnections: 0, // TODO: Track actual connections
      cacheHitRate,
      geoProviderStats
    };
  }

  /**
   * Get alerts based on SLA thresholds
   */
  async getAlerts(): Promise<Array<{ level: 'warning' | 'critical'; message: string; metric: string; value: number }>> {
    const metrics = await this.getMetrics();
    const alerts = [];

    // Critical: P95 latency > 200ms (SLA violation)
    if (metrics.redirectLatencyP95 > 200) {
      alerts.push({
        level: 'critical' as const,
        message: `P95 redirect latency (${metrics.redirectLatencyP95.toFixed(1)}ms) exceeds SLA requirement of 200ms`,
        metric: 'redirect_latency_p95',
        value: metrics.redirectLatencyP95
      });
    }

    // Warning: P95 latency > 150ms (approaching SLA limit)
    if (metrics.redirectLatencyP95 > 150 && metrics.redirectLatencyP95 <= 200) {
      alerts.push({
        level: 'warning' as const,
        message: `P95 redirect latency (${metrics.redirectLatencyP95.toFixed(1)}ms) is approaching SLA limit`,
        metric: 'redirect_latency_p95',
        value: metrics.redirectLatencyP95
      });
    }

    // Critical: Fail-open rate > 3% (spec requirement)
    if (metrics.failOpenRate > 3) {
      alerts.push({
        level: 'critical' as const,
        message: `Fail-open rate (${metrics.failOpenRate.toFixed(1)}%) exceeds target of 3%`,
        metric: 'fail_open_rate',
        value: metrics.failOpenRate
      });
    }

    // Warning: Background success rate < 80%
    if (metrics.backgroundSuccessRate < 80) {
      alerts.push({
        level: 'warning' as const,
        message: `Background verification success rate (${metrics.backgroundSuccessRate.toFixed(1)}%) is low`,
        metric: 'background_success_rate',
        value: metrics.backgroundSuccessRate
      });
    }

    // Warning: Geo verification success rate < 90%
    if (metrics.geoVerificationSuccessRate < 90) {
      alerts.push({
        level: 'warning' as const,
        message: `Geo verification success rate (${metrics.geoVerificationSuccessRate.toFixed(1)}%) is low`,
        metric: 'geo_verification_success_rate',
        value: metrics.geoVerificationSuccessRate
      });
    }

    return alerts;
  }

  /**
   * Export metrics in Prometheus format (for monitoring integration)
   */
  exportPrometheusMetrics(): string {
    const metrics = this.metrics;
    let output = '';

    // Add help and type information
    output += '# HELP redirect_latency_ms Redirect latency in milliseconds\n';
    output += '# TYPE redirect_latency_ms histogram\n';

    // Export latency histogram
    const latencies = this.getMetricValues('redirect_latency_ms', 5 * 60 * 1000);
    const buckets = [10, 25, 50, 100, 150, 200, 300, 500, 1000];
    
    for (const bucket of buckets) {
      const count = latencies.filter(l => l <= bucket).length;
      output += `redirect_latency_ms_bucket{le="${bucket}"} ${count}\n`;
    }
    
    output += `redirect_latency_ms_count ${latencies.length}\n`;
    output += `redirect_latency_ms_sum ${latencies.reduce((a, b) => a + b, 0)}\n`;

    // Add other metrics
    const failOpenRate = this.calculateFailOpenRate();
    output += `\n# HELP fail_open_rate Percentage of requests that failed open\n`;
    output += `# TYPE fail_open_rate gauge\n`;
    output += `fail_open_rate ${failOpenRate}\n`;

    return output;
  }

  private initializeMetrics(): void {
    const metricNames = [
      'redirect_latency_ms',
      'fail_open_count',
      'fail_open_latency_ms',
      'background_verification',
      'geo_provider_latency_ms',
      'geo_provider_success',
      'cache_operations',
      'http_requests_total',
      'http_request_duration_ms'
    ];

    metricNames.forEach(name => {
      this.metrics.set(name, []);
    });
  }

  private addMetric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const dataPoints = this.metrics.get(name)!;
    dataPoints.push({
      timestamp: Date.now(),
      value,
      labels
    });

    // Keep only recent data points
    if (dataPoints.length > this.maxDataPoints) {
      dataPoints.splice(0, dataPoints.length - this.maxDataPoints);
    }
  }

  private getMetricValues(name: string, windowMs: number, labelFilter?: Record<string, string>): number[] {
    const dataPoints = this.metrics.get(name) || [];
    const cutoff = Date.now() - windowMs;

    return dataPoints
      .filter(dp => dp.timestamp >= cutoff)
      .filter(dp => {
        if (!labelFilter) return true;
        if (!dp.labels) return false;
        
        return Object.entries(labelFilter).every(([key, value]) => 
          dp.labels![key] === value
        );
      })
      .map(dp => dp.value);
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)] || 0;
  }

  private calculateFailOpenRate(): number {
    const windowMs = 5 * 60 * 1000;
    const totalRequests = this.getMetricValues('http_requests_total', windowMs).length;
    const failOpenCount = this.getMetricValues('fail_open_count', windowMs).length;
    
    return totalRequests > 0 ? (failOpenCount / totalRequests) * 100 : 0;
  }

  private getGeoProviderStats(provider: string, windowMs: number) {
    const latencies = this.getMetricValues('geo_provider_latency_ms', windowMs, { provider });
    const successes = this.getMetricValues('geo_provider_success', windowMs, { provider });
    
    const requests = latencies.length;
    const successCount = successes.filter(s => s === 1).length;
    const successRate = requests > 0 ? (successCount / requests) * 100 : 100;
    const avgLatency = requests > 0 ? latencies.reduce((a, b) => a + b, 0) / requests : 0;

    return { requests, successRate, avgLatency };
  }

  private getKeyType(key: string): string {
    if (key.startsWith('token:')) return 'token';
    if (key.startsWith('session:')) return 'session';
    if (key.startsWith('geo:')) return 'geo';
    return 'other';
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Keep 24 hours of data
    
    for (const [name, dataPoints] of this.metrics.entries()) {
      const filtered = dataPoints.filter(dp => dp.timestamp >= cutoff);
      this.metrics.set(name, filtered);
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();