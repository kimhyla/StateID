import { z } from 'zod';

// State codes (US states + territories + special cases)
export const StateCode = z.enum([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // Territories
  'Outside U.S.' // Special case for international clients
]);

export type StateCode = z.infer<typeof StateCode>;

// Verification status as defined in spec §5.2
export const VerificationStatus = z.enum([
  'verified',
  'unverified',
  'assumed_from_prior',
  'provider_assigned'
]);

export type VerificationStatus = z.infer<typeof VerificationStatus>;

// Verification method as defined in spec §5.2
export const VerificationMethod = z.enum([
  'auto',
  'self_declared',
  'provider_assigned',
  'assumed'
]);

export type VerificationMethod = z.infer<typeof VerificationMethod>;

// Video platform detection
export const VideoPlatform = z.enum([
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

export type VideoPlatform = z.infer<typeof VideoPlatform>;

// Session data model as defined in spec §11
export const Session = z.object({
  id: z.string().uuid(),
  meeting_ref: z.string(), // calendar UID + start; opaque, non-PHI
  clinician_id: z.string().uuid(),
  start_at: z.date(),
  end_at: z.date().optional(),
  platform: VideoPlatform,
  original_url: z.string().url(),
  wrapped_url: z.string().url(),
  created_at: z.date(),
  updated_at: z.date()
});

export type Session = z.infer<typeof Session>;

// Attendee event data model as defined in spec §11
export const AttendeeEvent = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  attendee_slot_hash: z.string(), // stable hash; tenant-salted
  status: VerificationStatus,
  state: StateCode.optional(),
  self_declared_state: StateCode.optional().nullable(),
  method: VerificationMethod.optional(),
  within_scope: z.boolean().nullable(),
  override_reason: z.string().optional().nullable(),
  override_timestamp_utc: z.date().optional().nullable(),
  timestamp_utc: z.date(),
  note_text: z.string().optional(),
  license_check_notes: z.string().optional(),
  geo_confidence: z.number().min(0).max(1).optional(),
  created_at: z.date(),
  updated_at: z.date()
});

export type AttendeeEvent = z.infer<typeof AttendeeEvent>;

// Clinician settings as defined in spec §11
export const ClinicianSettings = z.object({
  id: z.string().uuid(),
  clinician_id: z.string().uuid(),
  allowed_states: z.array(StateCode),
  psypact_enabled: z.boolean().default(false),
  policy_mode: z.enum(['assume', 'ask']).default('ask'),
  calendars: z.array(z.string()), // calendar IDs
  external_attendee_required: z.boolean().default(true),
  attendee_cap: z.number().int().min(1).max(50).default(10),
  retention_years: z.number().int().min(1).max(50).default(7),
  created_at: z.date(),
  updated_at: z.date()
});

export type ClinicianSettings = z.infer<typeof ClinicianSettings>;

// Geo-location verification result
export const GeoVerificationResult = z.object({
  state: StateCode.optional(),
  confidence: z.number().min(0).max(1),
  provider_a: z.object({
    state: StateCode.optional(),
    confidence: z.number().min(0).max(1),
    provider: z.string()
  }),
  provider_b: z.object({
    state: StateCode.optional(),
    confidence: z.number().min(0).max(1),
    provider: z.string()
  }).optional(),
  is_vpn_detected: z.boolean().default(false),
  is_hosting_detected: z.boolean().default(false),
  processing_time_ms: z.number(),
  ip_address: z.string().ip() // for audit purposes only
});

export type GeoVerificationResult = z.infer<typeof GeoVerificationResult>;

// URL pattern for video service detection
export const VideoUrlPattern = z.object({
  platform: VideoPlatform,
  regex: z.string(),
  priority: z.number().int().min(1).max(10),
  example_url: z.string().url()
});

export type VideoUrlPattern = z.infer<typeof VideoUrlPattern>;

// Export schema for audit compliance
export const ExportRow = z.object({
  meeting_ref: z.string(),
  attendee_slot_hash: z.string(),
  status: VerificationStatus,
  state: StateCode.optional(),
  within_scope: z.boolean().nullable(),
  timestamp_utc: z.date(),
  method: VerificationMethod.optional(),
  self_declared_state: StateCode.optional().nullable(),
  override_reason: z.string().optional().nullable(),
  override_timestamp_utc: z.date().optional().nullable(),
  note_text: z.string().optional(),
  license_check_notes: z.string().optional(),
  geo_confidence: z.number().min(0).max(1).optional(),
  schema_version: z.literal(1)
});

export type ExportRow = z.infer<typeof ExportRow>;