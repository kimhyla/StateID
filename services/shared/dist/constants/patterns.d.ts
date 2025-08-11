import { VideoUrlPattern } from '../types/session';
export declare const VIDEO_URL_PATTERNS: VideoUrlPattern[];
export declare const PSYPACT_STATES: readonly ["AL", "AZ", "AR", "CO", "CT", "DE", "FL", "GA", "ID", "IL", "IN", "KS", "KY", "ME", "MD", "MI", "MN", "MO", "NE", "NV", "NH", "NJ", "NC", "OH", "OK", "PA", "TN", "TX", "UT", "VA", "WA", "WV", "WI", "WY"];
export declare const PERFORMANCE_CONSTANTS: {
    readonly REDIRECT_TIMEOUT_MS: 200;
    readonly FAIL_OPEN_THRESHOLD_MS: 200;
    readonly BACKGROUND_RETRY_DELAYS_MS: readonly [250, 750, 2000];
    readonly MAX_BACKGROUND_RETRY_TIME_MS: 180000;
    readonly ASSUME_STATE_MAX_AGE_DAYS: 90;
    readonly TOKEN_TTL_OFFSET_MINUTES: 60;
    readonly TOKEN_TTL_EXTENSION_HOURS: 12;
    readonly KEY_ROTATION_GRACE_HOURS: 24;
};
export declare const GEO_CONFIDENCE_THRESHOLDS: {
    readonly HIGH_CONFIDENCE: 0.8;
    readonly MEDIUM_CONFIDENCE: 0.6;
    readonly MINIMUM_CONFIDENCE: 0.6;
};
export declare const RATE_LIMITS: {
    readonly WRAPPER_REQUESTS_PER_MINUTE: 1000;
    readonly CALENDAR_WEBHOOK_PER_MINUTE: 100;
    readonly GEO_LOOKUPS_PER_MINUTE: 500;
};
