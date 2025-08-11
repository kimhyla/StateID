"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportRow = exports.VideoUrlPattern = exports.GeoVerificationResult = exports.ClinicianSettings = exports.AttendeeEvent = exports.Session = exports.VideoPlatform = exports.VerificationMethod = exports.VerificationStatus = exports.StateCode = void 0;
const zod_1 = require("zod");
// State codes (US states + territories + special cases)
exports.StateCode = zod_1.z.enum([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // Territories
    'Outside U.S.' // Special case for international clients
]);
// Verification status as defined in spec §5.2
exports.VerificationStatus = zod_1.z.enum([
    'verified',
    'unverified',
    'assumed_from_prior',
    'provider_assigned'
]);
// Verification method as defined in spec §5.2
exports.VerificationMethod = zod_1.z.enum([
    'auto',
    'self_declared',
    'provider_assigned',
    'assumed'
]);
// Video platform detection
exports.VideoPlatform = zod_1.z.enum([
    'zoom',
    'google_meet',
    'microsoft_teams',
    'webex',
    'doxy',
    'vsee',
    'doximity',
    'ringcentral',
    'bluejeans',
    'custom'
]);
// Session data model as defined in spec §11
exports.Session = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    meeting_ref: zod_1.z.string(), // calendar UID + start; opaque, non-PHI
    clinician_id: zod_1.z.string().uuid(),
    start_at: zod_1.z.date(),
    end_at: zod_1.z.date().optional(),
    platform: exports.VideoPlatform,
    original_url: zod_1.z.string().url(),
    wrapped_url: zod_1.z.string().url(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date()
});
// Attendee event data model as defined in spec §11
exports.AttendeeEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    session_id: zod_1.z.string().uuid(),
    attendee_slot_hash: zod_1.z.string(), // stable hash; tenant-salted
    status: exports.VerificationStatus,
    state: exports.StateCode.optional(),
    self_declared_state: exports.StateCode.optional().nullable(),
    method: exports.VerificationMethod.optional(),
    within_scope: zod_1.z.boolean().nullable(),
    override_reason: zod_1.z.string().optional().nullable(),
    override_timestamp_utc: zod_1.z.date().optional().nullable(),
    timestamp_utc: zod_1.z.date(),
    note_text: zod_1.z.string().optional(),
    license_check_notes: zod_1.z.string().optional(),
    geo_confidence: zod_1.z.number().min(0).max(1).optional(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date()
});
// Clinician settings as defined in spec §11
exports.ClinicianSettings = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    clinician_id: zod_1.z.string().uuid(),
    allowed_states: zod_1.z.array(exports.StateCode),
    psypact_enabled: zod_1.z.boolean().default(false),
    policy_mode: zod_1.z.enum(['assume', 'ask']).default('ask'),
    calendars: zod_1.z.array(zod_1.z.string()), // calendar IDs
    external_attendee_required: zod_1.z.boolean().default(true),
    attendee_cap: zod_1.z.number().int().min(1).max(50).default(10),
    retention_years: zod_1.z.number().int().min(1).max(50).default(7),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date()
});
// Geo-location verification result
exports.GeoVerificationResult = zod_1.z.object({
    state: exports.StateCode.optional(),
    confidence: zod_1.z.number().min(0).max(1),
    provider_a: zod_1.z.object({
        state: exports.StateCode.optional(),
        confidence: zod_1.z.number().min(0).max(1),
        provider: zod_1.z.string()
    }),
    provider_b: zod_1.z.object({
        state: exports.StateCode.optional(),
        confidence: zod_1.z.number().min(0).max(1),
        provider: zod_1.z.string()
    }).optional(),
    is_vpn_detected: zod_1.z.boolean().default(false),
    is_hosting_detected: zod_1.z.boolean().default(false),
    processing_time_ms: zod_1.z.number(),
    ip_address: zod_1.z.string().ip() // for audit purposes only
});
// URL pattern for video service detection
exports.VideoUrlPattern = zod_1.z.object({
    platform: exports.VideoPlatform,
    regex: zod_1.z.string(),
    priority: zod_1.z.number().int().min(1).max(10),
    example_url: zod_1.z.string().url()
});
// Export schema for audit compliance
exports.ExportRow = zod_1.z.object({
    meeting_ref: zod_1.z.string(),
    attendee_slot_hash: zod_1.z.string(),
    status: exports.VerificationStatus,
    state: exports.StateCode.optional(),
    within_scope: zod_1.z.boolean().nullable(),
    timestamp_utc: zod_1.z.date(),
    method: exports.VerificationMethod.optional(),
    self_declared_state: exports.StateCode.optional().nullable(),
    override_reason: zod_1.z.string().optional().nullable(),
    override_timestamp_utc: zod_1.z.date().optional().nullable(),
    note_text: zod_1.z.string().optional(),
    license_check_notes: zod_1.z.string().optional(),
    geo_confidence: zod_1.z.number().min(0).max(1).optional(),
    schema_version: zod_1.z.literal(1)
});
