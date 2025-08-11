# StateID - Therapist State Verification System

StateID quietly confirms a client's state for video sessions by auto-wrapping join links inside calendar invites. It adds ~0.1–0.2s overhead, fails open if slower, and produces a clean Verified checkmark plus an audit-ready ledger.

## 🎯 MVP Goals

- **Invisible Integration**: Zero workflow change for therapists
- **Performance**: ≤200ms click-through latency (p95)
- **Compliance**: Audit-ready ledger with 7-year retention
- **Privacy**: No PHI on servers, local exports only
- **Reliability**: Fail-open design with background retries

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Desktop Agent  │    │  Calendar Service│    │ Wrapper Service │
│   (Electron)    │◄──►│   (Node.js)      │◄──►│   (Node.js)     │
│                 │    │                  │    │                 │
│ • UI Overlays   │    │ • Event Monitor  │    │ • URL Redirect  │
│ • OAuth Tokens  │    │ • Link Rewriter  │    │ • Geo Lookup    │
│ • Local Export  │    │ • Webhook Mgmt   │    │ • <200ms SLA    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                       ┌────────▼────────┐      ┌────────▼────────┐
                       │   PostgreSQL    │      │      Redis      │
                       │                 │      │                 │
                       │ • Session Logs  │      │ • Rate Limits   │
                       │ • Audit Trail   │      │ • Temp State    │
                       │ • User Settings │      │ • Cache Layer   │
                       └─────────────────┘      └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Development Setup

```bash
# Clone and setup
git clone <repo>
cd stateid

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your config

# Start services
npm run dev:all

# Or start individually:
npm run dev:wrapper    # Wrapper service (port 3001)
npm run dev:calendar   # Calendar service (port 3002)
npm run dev:desktop    # Desktop app
```

### Project Structure

```
stateid/
├── services/
│   ├── wrapper-service/      # Ultra-fast URL redirect service
│   ├── calendar-service/     # Event monitoring & rewriting
│   └── shared/              # Common utilities & types
├── desktop-app/             # Electron desktop application
├── database/               # DB migrations & schema
├── docs/                   # Technical documentation
└── tools/                  # Development & deployment tools
```

## 📚 Key Features (MVP)

### Core Functionality
- [x] URL detection & wrapping (Zoom/Meet/Teams/Webex)
- [x] Calendar integration (Google Calendar, Outlook)
- [x] Geo-location verification (<200ms)
- [x] Desktop overlay system
- [x] Local audit exports (PDF/CSV)

### Supported Platforms
- **Video**: Zoom, Google Meet, Microsoft Teams, Webex, Doxy, VSee
- **Calendars**: Google Calendar, Microsoft 365 (Outlook)
- **Desktop**: macOS 10.15+, Windows 10+

### Authentication
- Passwordless OAuth (Google/Microsoft)
- Email magic links
- Secure token storage (OS keychain)

## 🔧 Development

### Running Tests
```bash
npm test                    # All tests
npm run test:wrapper       # Wrapper service tests
npm run test:calendar      # Calendar service tests
npm run test:desktop       # Desktop app tests
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/stateid
REDIS_URL=redis://localhost:6379

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Services
WRAPPER_SERVICE_URL=http://localhost:3001
CALENDAR_SERVICE_URL=http://localhost:3002
JWT_SECRET=your_jwt_secret

# Geo Services
MAXMIND_LICENSE_KEY=your_maxmind_key
IP2LOCATION_API_KEY=your_ip2location_key
```

## 🚀 Deployment

### Production
```bash
# Build all services
npm run build

# Deploy with Docker
docker-compose up -d

# Or deploy to AWS ECS
npm run deploy:production
```

### Performance Requirements
- Wrapper service: p95 < 200ms
- Fail-open rate: < 3%
- Uptime: 99.9%

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

Private - All rights reserved

## 🔒 Security & Compliance

- TLS everywhere
- At-rest encryption
- Per-tenant salts
- HIPAA-ready architecture
- No PHI on servers (MVP)
- 7-year audit retention

---

For detailed technical documentation, see [docs/](./docs/)