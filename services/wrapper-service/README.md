# StateID Wrapper Service

The **wrapper service** is the critical path component of StateID that must achieve **<200ms p95 latency** for client redirects while performing geo-location verification. This service handles the core URL wrapping, token resolution, and state verification functionality.

## 🎯 Core Responsibilities

- **Ultra-fast URL redirection** (<200ms SLA requirement)
- **Multi-provider geo-location verification** with confidence scoring
- **HMAC-signed token generation** and validation
- **Graceful fail-open behavior** when performance budget exceeded
- **Real-time metrics collection** and SLA monitoring
- **Background retry mechanism** for failed verifications

## 🏗 Architecture

```
Client Click → Token Resolution → Geo Verification → Redirect
     ↓              ↓               ↓              ↓
  <10ms          <50ms          <140ms        Immediate
```

### Performance Budget Breakdown
- **Token Resolution**: <50ms (Redis lookup + JWT verification)
- **Geo Verification**: <140ms (parallel provider lookups)
- **Response Generation**: <10ms (HTTP redirect)
- **Total Budget**: <200ms (p95 requirement)

## 📂 Service Structure

```
src/
├── server.ts              # Main Fastify server with optimized routing
├── config.ts              # Environment configuration
├── services/
│   ├── geo-service.ts     # Multi-provider geo-location with confidence rules
│   ├── redirect-service.ts # Token generation, resolution, and caching
│   ├── metrics-service.ts  # SLA monitoring and alerting
│   └── redis-service.ts    # High-performance Redis caching
└── test-demo.ts           # Interactive demonstration script
```

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run demo script
npm run demo
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker
```bash
# Build container
docker build -t stateid-wrapper .

# Run with environment variables
docker run -p 3001:3001 \
  -e REDIS_URL=redis://localhost:6379 \
  -e MAXMIND_LICENSE_KEY=your_key \
  stateid-wrapper
```

## 🔧 Configuration

Key environment variables:

```bash
# Performance settings (critical)
REDIRECT_TIMEOUT_MS=200          # Hard limit for redirects
FAIL_OPEN_THRESHOLD_MS=200       # When to fail open
BACKGROUND_RETRY_ATTEMPTS=3      # Background retry attempts

# Geo-location providers
MAXMIND_LICENSE_KEY=your_key     # Primary provider (local DB)
IP2LOCATION_API_KEY=your_key     # Secondary provider (API)
IPGEOLOCATION_API_KEY=your_key   # Fallback provider

# Caching
REDIS_URL=redis://localhost:6379 # High-speed token cache

# Security
JWT_SECRET=your_secret_key       # Token signing key
```

## 📡 API Endpoints

### Core Endpoints

#### `GET /r/:token` - Main Redirect (Critical Path)
The primary endpoint that clients access. Must complete in <200ms.

**Flow:**
1. Resolve token from Redis cache
2. Perform parallel geo-location verification
3. Record metrics and verification data
4. Redirect to original URL (fail open if slow)

```bash
curl -I "http://localhost:3001/r/abc123token"
# Expected: 302 redirect with Location header
```

#### `POST /declare/:token` - Client Self-Declaration
Used for "Ask" flow when clients manually declare their state.

```bash
curl -X POST "http://localhost:3001/declare/abc123token" \
  -H "Content-Type: application/json" \
  -d '{"state": "CA"}'
```

### Monitoring Endpoints

#### `GET /health` - Health Check
```bash
curl "http://localhost:3001/health"
# Returns: {"status": "ok", "timestamp": "...", "service": "wrapper"}
```

#### `GET /metrics` - Performance Metrics
```bash
curl "http://localhost:3001/metrics"
# Returns detailed performance metrics including SLA compliance
```

#### `GET /metrics/prometheus` - Prometheus Format
```bash
curl "http://localhost:3001/metrics/prometheus"
# Returns metrics in Prometheus exposition format
```

#### `GET /alerts` - Active Alerts
```bash
curl "http://localhost:3001/alerts"
# Returns any active SLA violations or performance warnings
```

## 🌍 Geo-Location System

### Multi-Provider Architecture
The service uses multiple geo-location providers for accuracy and redundancy:

1. **MaxMind GeoLite2** (Primary) - Local database lookup
2. **IP2Location** (Secondary) - API-based verification  
3. **IPGeolocation** (Fallback) - Additional coverage

### Confidence Scoring Rules
Based on specification §11:

- **High Confidence (≥0.80)**: Provider A confidence ≥ 0.80 + Provider B agrees
- **Medium Confidence (0.60-0.79)**: Provider A 0.60-0.79 + Provider B exact match
- **Low Confidence (<0.60)**: Marked as unverified

### VPN/Hosting Detection
- Automatic detection of VPN and hosting providers
- Always marks as unverified when detected
- Configurable detection patterns

## 🔐 Security Features

### Token Security
- **HMAC-SHA256 signed** JWT tokens
- **Short TTL** based on meeting window
- **Key rotation** support with 24-hour grace period
- **Destination binding** to prevent replay attacks

### Privacy
- **No PHI on servers** - verification data sent to calendar service
- **IP address hashing** for audit trails
- **Minimal data retention** with configurable purging

## 📊 Metrics & SLA Monitoring

### Key Metrics Tracked
- **P50/P95/P99 redirect latency** (SLA: p95 <200ms)
- **Fail-open rate** (Target: <3%)
- **Geo verification success rate**
- **Background retry success rate**
- **Cache hit rate**
- **Provider-specific performance**

### Alerting Thresholds
- **CRITICAL**: P95 latency >200ms (SLA violation)
- **CRITICAL**: Fail-open rate >3%
- **WARNING**: P95 latency >150ms (approaching limit)
- **WARNING**: Geo success rate <90%

### Prometheus Integration
```bash
# Scrape endpoint for monitoring
GET /metrics/prometheus

# Example metrics
redirect_latency_ms_bucket{le="200"} 950
redirect_latency_ms_count 1000
fail_open_rate 1.2
```

## 🔄 Fail-Open Behavior

When verification cannot complete within the performance budget:

1. **Immediate redirect** to original URL
2. **Background retry** with exponential backoff (250ms → 750ms → 2s)
3. **Metrics recording** for monitoring
4. **Notification** to calendar service for fallback flows

This ensures clients are never blocked while maintaining audit compliance.

## 🧪 Testing & Demo

### Run Interactive Demo
```bash
npm run demo
```

The demo script shows:
- Token generation and resolution
- Geo-location verification with timing
- Metrics collection and SLA monitoring
- Self-declaration flow simulation
- Alert system demonstration

### Performance Testing
```bash
# Load test the critical path
npm run test:load

# Benchmark geo providers
npm run test:geo

# SLA compliance verification
npm run test:sla
```

## 🚨 Troubleshooting

### Common Issues

**High P95 latency (>200ms)**
- Check geo-provider response times
- Verify Redis connectivity and performance
- Review background retry backlog

**High fail-open rate (>3%)**
- Investigate geo-provider reliability
- Check network connectivity to providers
- Review timeout configurations

**Cache misses**
- Verify Redis connection
- Check token TTL settings
- Monitor Redis memory usage

### Debug Mode
```bash
# Enable verbose logging
DEBUG=stateid:* npm run dev

# Check specific components
DEBUG=stateid:geo npm run dev
DEBUG=stateid:redis npm run dev
```

## 🔮 Next Steps

Phase 1 (Current) ✅:
- [x] Core redirect functionality
- [x] Multi-provider geo-location
- [x] Metrics and monitoring
- [x] Redis caching

Phase 2 (Next):
- [ ] Real Redis client integration
- [ ] Production geo-provider APIs
- [ ] Enhanced VPN detection
- [ ] Rate limiting by client IP
- [ ] Distributed caching

---

**Critical Performance Requirements**: This service MUST maintain p95 latency <200ms and fail-open rate <3% per StateID specification requirements.