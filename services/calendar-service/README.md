# StateID Calendar Service

The **calendar service** handles automatic URL rewriting in Google Calendar and Microsoft Outlook events, providing invisible integration for therapists while maintaining rollback safety and compliance.

## 🎯 Core Functionality

- **Automatic URL Detection**: Recognizes video meeting URLs across 9+ platforms
- **Priority-Based Rewriting**: Location field > Description field, Zoom > Teams > Meet > others
- **Real-Time Monitoring**: Webhook-driven event processing for instant updates
- **Rollback Safety**: Original URLs preserved in metadata for emergency restoration
- **Idempotent Processing**: Prevents duplicate wrapping of same events

## 🏗 Architecture

```
Calendar Event → URL Detection → Priority Selection → Wrapper Generation → Event Update
      ↓              ↓               ↓                    ↓                ↓
  Google/Outlook   9 Platforms   Spec Priority        StateID Token     Metadata Storage
```

### Key Components

1. **URL Rewriter Engine** (`url-rewriter.ts`)
   - Detects video meeting URLs using regex patterns
   - Implements priority system from StateID specification
   - Generates wrapper URLs via wrapper service integration

2. **Google Calendar Integration** (`google-calendar.ts`)
   - OAuth 2.0 authentication with Google APIs
   - Webhook subscriptions for real-time event monitoring
   - Event updates with `sendUpdates: 'none'` (no attendee emails)

3. **Outlook Integration** (`outlook-calendar.ts`)
   - Microsoft Graph API with MSAL authentication
   - Graph subscriptions for event change notifications
   - Extension-based metadata storage

## 🚀 Quick Start

### Run Demo
```bash
cd services/calendar-service
npm install
npm run demo
```

### Supported Platforms

| Platform | Priority | Regex Pattern | Example |
|----------|----------|---------------|---------|
| Zoom | 1 | `zoom.us/j/` | `https://zoom.us/j/1234567890` |
| Microsoft Teams | 2 | `teams.microsoft.com/l/meetup-join/` | `https://teams.microsoft.com/l/meetup-join/...` |
| Google Meet | 3 | `meet.google.com/` | `https://meet.google.com/abc-defg-hij` |
| Webex | 4 | `webex.com/` | `https://company.webex.com/meet/user` |
| Doxy | 5 | `doxy.me/` | `https://doxy.me/doctor123` |
| VSee | 6 | `vsee.com/` | `https://clinic.vsee.com/room/doctor` |
| Doximity | 7 | `doximity.com/` | `https://video.doximity.com/room/doctor` |
| RingCentral | 8 | `ringcentral.com/` | `https://meetings.ringcentral.com/j/123` |
| BlueJeans | 9 | `bluejeans.com/` | `https://bluejeans.com/1234567890` |

## 📡 API Integration

### Google Calendar Setup
```typescript
const googleService = new GoogleCalendarService({
  clientId: 'your-google-client-id',
  clientSecret: 'your-google-client-secret',
  redirectUri: 'your-redirect-uri',
  refreshToken: 'user-refresh-token'
});

// Setup webhook for real-time monitoring
const webhook = await googleService.setupWebhook(
  'primary', 
  'https://your-domain.com/webhooks/google'
);
```

### Microsoft Graph Setup
```typescript
const outlookService = new OutlookCalendarService({
  clientId: 'your-microsoft-client-id',
  clientSecret: 'your-microsoft-client-secret',
  tenantId: 'your-tenant-id',
  redirectUri: 'your-redirect-uri',
  refreshToken: 'user-refresh-token'
});

// Setup Graph subscription
const subscription = await outlookService.setupWebhook(
  'primary',
  'https://your-domain.com/webhooks/microsoft'
);
```

## 🔧 URL Rewriting Engine

### Priority System Implementation

The rewriter follows StateID specification requirements:

1. **Field Priority**: Location field takes precedence over Description
2. **Platform Priority**: Zoom > Teams > Meet > Webex > others
3. **Single URL**: Only the first matching URL is wrapped per event

### Example Processing

```typescript
// Input event
const event = {
  location: 'Conference Room A',
  description: 'Join via: https://zoom.us/j/1234567890'
};

// Processing result
const result = await urlRewriterService.rewriteCalendarEvent(
  event.location,
  event.description,
  metadata
);

// Output
{
  location: 'Conference Room A',
  description: 'Join via: https://stateid.app/r/abc123token',
  sessionData: {
    sessionId: 'uuid-session-id',
    originalUrl: 'https://zoom.us/j/1234567890',
    platform: 'zoom'
  }
}
```

## 🔄 Rollback Safety

### Metadata Preservation

**Google Calendar** (Extended Properties):
```javascript
extendedProperties: {
  private: {
    'stateid_original_url': 'https://zoom.us/j/1234567890',
    'stateid_session_id': 'uuid-session-id',
    'stateid_platform': 'zoom',
    'stateid_wrapped_at': '2024-01-15T10:00:00Z'
  }
}
```

**Microsoft Graph** (Extensions):
```javascript
extensions: [{
  '@odata.type': 'microsoft.graph.openTypeExtension',
  extensionName: 'com.stateid.metadata',
  stateid_original_url: 'https://zoom.us/j/1234567890',
  stateid_session_id: 'uuid-session-id',
  stateid_platform: 'zoom'
}]
```

### Emergency Rollback
```typescript
// Restore original URL
await googleService.rollbackEvent('event-id', 'calendar-id');
await outlookService.rollbackEvent('event-id', 'calendar-id');
```

## 📊 Demo Results

Our comprehensive demo shows:

✅ **URL Detection**: Successfully detects video URLs across all platforms  
✅ **Priority System**: Correctly implements Location > Description priority  
✅ **Platform Priority**: Follows Zoom > Teams > Meet hierarchy  
✅ **Idempotence**: Prevents duplicate processing of same events  
✅ **Rollback Safety**: Original URLs preserved and restorable  
✅ **Webhook Ready**: Real-time processing infrastructure complete  

### Sample Output
```
📅 Processing: Therapy Session with Jane Doe
   Location: https://zoom.us/j/1234567890?pwd=example
   ✅ URL Detected & Wrapped!
      Platform: zoom
      Original: https://zoom.us/j/1234567890?pwd=example
      New Location: https://stateid.app/r/Dq_TzvtQoHojoLCr
```

## 🔐 Security & Compliance

### HIPAA Compliance Features
- **No Attendee Emails**: Updates use `sendUpdates: 'none'`
- **Metadata Isolation**: StateID data stored in separate properties/extensions
- **Rollback Capability**: Emergency restoration of original URLs
- **Audit Trail**: Complete session tracking with timestamps

### Error Handling
- **Graceful Degradation**: Events remain unchanged on rewriting failures
- **Service Isolation**: Google/Outlook failures don't affect each other
- **Idempotent Operations**: Safe to retry processing

## 🚀 Production Deployment

### Environment Variables
```bash
# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft Graph
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_tenant_id

# StateID Integration
WRAPPER_SERVICE_URL=https://stateid.app
```

### Webhook Endpoints
- **Google Calendar**: `POST /webhooks/google`
- **Microsoft Graph**: `POST /webhooks/microsoft`

### Health Monitoring
- **Webhook Renewal**: Auto-renewal before 24-hour expiration
- **Token Refresh**: Automatic OAuth token management
- **Error Alerting**: Failed rewrite notifications

---

**✅ Phase 2 Complete**: Calendar integration with automatic URL rewriting is fully implemented and tested. Ready for Phase 3: Desktop UI + Database Integration!