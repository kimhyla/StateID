"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = exports.GEO_CONFIDENCE_THRESHOLDS = exports.PERFORMANCE_CONSTANTS = exports.PSYPACT_STATES = exports.VIDEO_URL_PATTERNS = void 0;
// URL detection patterns as defined in spec §11
exports.VIDEO_URL_PATTERNS = [
    {
        platform: 'zoom',
        regex: 'https?://(www\\.)?zoom\\.us/j/[^\\s)]+',
        priority: 1, // Highest priority per spec
        example_url: 'https://zoom.us/j/1234567890'
    },
    {
        platform: 'microsoft_teams',
        regex: 'https?://teams\\.microsoft\\.com/l/meetup-join/[^\\s)]+',
        priority: 2,
        example_url: 'https://teams.microsoft.com/l/meetup-join/19%3Ameeting_example'
    },
    {
        platform: 'google_meet',
        regex: 'https?://meet\\.google\\.com/[a-z-]+',
        priority: 3,
        example_url: 'https://meet.google.com/abc-defg-hij'
    },
    {
        platform: 'webex',
        regex: 'https?://[^\\s]*\\.webex\\.com/[^\\s)]+',
        priority: 4,
        example_url: 'https://company.webex.com/meet/username'
    },
    {
        platform: 'doxy',
        regex: 'https?://[^\\s]*\\.doxy\\.me/[^\\s)]+',
        priority: 5,
        example_url: 'https://doxy.me/doctor123'
    },
    {
        platform: 'vsee',
        regex: 'https?://[^\\s]*\\.vsee\\.com/[^\\s)]+',
        priority: 6,
        example_url: 'https://clinic.vsee.com/room/doctor'
    },
    {
        platform: 'doximity',
        regex: 'https?://[^\\s]*\\.doximity\\.com/[^\\s)]+',
        priority: 7,
        example_url: 'https://video.doximity.com/room/doctor'
    },
    {
        platform: 'ringcentral',
        regex: 'https?://[^\\s]*\\.ringcentral\\.com/[^\\s)]+',
        priority: 8,
        example_url: 'https://meetings.ringcentral.com/j/1234567890'
    },
    {
        platform: 'bluejeans',
        regex: 'https?://[^\\s]*\\.bluejeans\\.com/[^\\s)]+',
        priority: 9,
        example_url: 'https://bluejeans.com/1234567890'
    }
];
// PSYPACT member states (current as of 2024)
exports.PSYPACT_STATES = [
    'AL', 'AZ', 'AR', 'CO', 'CT', 'DE', 'FL', 'GA', 'ID', 'IL',
    'IN', 'KS', 'KY', 'ME', 'MD', 'MI', 'MN', 'MO', 'NE', 'NV',
    'NH', 'NJ', 'NC', 'OH', 'OK', 'PA', 'TN', 'TX', 'UT', 'VA',
    'WA', 'WV', 'WI', 'WY'
];
// Performance thresholds as defined in spec
exports.PERFORMANCE_CONSTANTS = {
    REDIRECT_TIMEOUT_MS: 200, // p95 requirement
    FAIL_OPEN_THRESHOLD_MS: 200,
    BACKGROUND_RETRY_DELAYS_MS: [250, 750, 2000], // Exponential backoff
    MAX_BACKGROUND_RETRY_TIME_MS: 180000, // 3 minutes
    ASSUME_STATE_MAX_AGE_DAYS: 90, // §5.4 cap
    TOKEN_TTL_OFFSET_MINUTES: 60, // Meeting window buffer
    TOKEN_TTL_EXTENSION_HOURS: 12, // After meeting starts
    KEY_ROTATION_GRACE_HOURS: 24 // Security requirement
};
// Geo-confidence thresholds as defined in spec §11
exports.GEO_CONFIDENCE_THRESHOLDS = {
    HIGH_CONFIDENCE: 0.80, // Provider A ≥ 0.80 + Provider B agrees
    MEDIUM_CONFIDENCE: 0.60, // Provider A 0.60-0.79 + Provider B exact match
    MINIMUM_CONFIDENCE: 0.60
};
// Rate limiting constants
exports.RATE_LIMITS = {
    WRAPPER_REQUESTS_PER_MINUTE: 1000,
    CALENDAR_WEBHOOK_PER_MINUTE: 100,
    GEO_LOOKUPS_PER_MINUTE: 500
};
