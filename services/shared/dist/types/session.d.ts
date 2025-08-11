import { z } from 'zod';
export declare const StateCode: z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>;
export type StateCode = z.infer<typeof StateCode>;
export declare const VerificationStatus: z.ZodEnum<["verified", "unverified", "assumed_from_prior", "provider_assigned"]>;
export type VerificationStatus = z.infer<typeof VerificationStatus>;
export declare const VerificationMethod: z.ZodEnum<["auto", "self_declared", "provider_assigned", "assumed"]>;
export type VerificationMethod = z.infer<typeof VerificationMethod>;
export declare const VideoPlatform: z.ZodEnum<["zoom", "google_meet", "microsoft_teams", "webex", "doxy", "vsee", "doximity", "ringcentral", "bluejeans", "custom"]>;
export type VideoPlatform = z.infer<typeof VideoPlatform>;
export declare const Session: z.ZodObject<{
    id: z.ZodString;
    meeting_ref: z.ZodString;
    clinician_id: z.ZodString;
    start_at: z.ZodDate;
    end_at: z.ZodOptional<z.ZodDate>;
    platform: z.ZodEnum<["zoom", "google_meet", "microsoft_teams", "webex", "doxy", "vsee", "doximity", "ringcentral", "bluejeans", "custom"]>;
    original_url: z.ZodString;
    wrapped_url: z.ZodString;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    meeting_ref: string;
    clinician_id: string;
    start_at: Date;
    platform: "zoom" | "google_meet" | "microsoft_teams" | "webex" | "doxy" | "vsee" | "doximity" | "ringcentral" | "bluejeans" | "custom";
    original_url: string;
    wrapped_url: string;
    created_at: Date;
    updated_at: Date;
    end_at?: Date | undefined;
}, {
    id: string;
    meeting_ref: string;
    clinician_id: string;
    start_at: Date;
    platform: "zoom" | "google_meet" | "microsoft_teams" | "webex" | "doxy" | "vsee" | "doximity" | "ringcentral" | "bluejeans" | "custom";
    original_url: string;
    wrapped_url: string;
    created_at: Date;
    updated_at: Date;
    end_at?: Date | undefined;
}>;
export type Session = z.infer<typeof Session>;
export declare const AttendeeEvent: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    attendee_slot_hash: z.ZodString;
    status: z.ZodEnum<["verified", "unverified", "assumed_from_prior", "provider_assigned"]>;
    state: z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>;
    self_declared_state: z.ZodNullable<z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>>;
    method: z.ZodOptional<z.ZodEnum<["auto", "self_declared", "provider_assigned", "assumed"]>>;
    within_scope: z.ZodNullable<z.ZodBoolean>;
    override_reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    override_timestamp_utc: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    timestamp_utc: z.ZodDate;
    note_text: z.ZodOptional<z.ZodString>;
    license_check_notes: z.ZodOptional<z.ZodString>;
    geo_confidence: z.ZodOptional<z.ZodNumber>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "verified" | "unverified" | "assumed_from_prior" | "provider_assigned";
    id: string;
    created_at: Date;
    updated_at: Date;
    session_id: string;
    attendee_slot_hash: string;
    within_scope: boolean | null;
    timestamp_utc: Date;
    state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    self_declared_state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | null | undefined;
    method?: "provider_assigned" | "auto" | "self_declared" | "assumed" | undefined;
    override_reason?: string | null | undefined;
    override_timestamp_utc?: Date | null | undefined;
    note_text?: string | undefined;
    license_check_notes?: string | undefined;
    geo_confidence?: number | undefined;
}, {
    status: "verified" | "unverified" | "assumed_from_prior" | "provider_assigned";
    id: string;
    created_at: Date;
    updated_at: Date;
    session_id: string;
    attendee_slot_hash: string;
    within_scope: boolean | null;
    timestamp_utc: Date;
    state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    self_declared_state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | null | undefined;
    method?: "provider_assigned" | "auto" | "self_declared" | "assumed" | undefined;
    override_reason?: string | null | undefined;
    override_timestamp_utc?: Date | null | undefined;
    note_text?: string | undefined;
    license_check_notes?: string | undefined;
    geo_confidence?: number | undefined;
}>;
export type AttendeeEvent = z.infer<typeof AttendeeEvent>;
export declare const ClinicianSettings: z.ZodObject<{
    id: z.ZodString;
    clinician_id: z.ZodString;
    allowed_states: z.ZodArray<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>, "many">;
    psypact_enabled: z.ZodDefault<z.ZodBoolean>;
    policy_mode: z.ZodDefault<z.ZodEnum<["assume", "ask"]>>;
    calendars: z.ZodArray<z.ZodString, "many">;
    external_attendee_required: z.ZodDefault<z.ZodBoolean>;
    attendee_cap: z.ZodDefault<z.ZodNumber>;
    retention_years: z.ZodDefault<z.ZodNumber>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    clinician_id: string;
    created_at: Date;
    updated_at: Date;
    allowed_states: ("AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S.")[];
    psypact_enabled: boolean;
    policy_mode: "assume" | "ask";
    calendars: string[];
    external_attendee_required: boolean;
    attendee_cap: number;
    retention_years: number;
}, {
    id: string;
    clinician_id: string;
    created_at: Date;
    updated_at: Date;
    allowed_states: ("AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S.")[];
    calendars: string[];
    psypact_enabled?: boolean | undefined;
    policy_mode?: "assume" | "ask" | undefined;
    external_attendee_required?: boolean | undefined;
    attendee_cap?: number | undefined;
    retention_years?: number | undefined;
}>;
export type ClinicianSettings = z.infer<typeof ClinicianSettings>;
export declare const GeoVerificationResult: z.ZodObject<{
    state: z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>;
    confidence: z.ZodNumber;
    provider_a: z.ZodObject<{
        state: z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>;
        confidence: z.ZodNumber;
        provider: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    }, {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    }>;
    provider_b: z.ZodOptional<z.ZodObject<{
        state: z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>;
        confidence: z.ZodNumber;
        provider: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    }, {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    }>>;
    is_vpn_detected: z.ZodDefault<z.ZodBoolean>;
    is_hosting_detected: z.ZodDefault<z.ZodBoolean>;
    processing_time_ms: z.ZodNumber;
    ip_address: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    provider_a: {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    };
    is_vpn_detected: boolean;
    is_hosting_detected: boolean;
    processing_time_ms: number;
    ip_address: string;
    state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    provider_b?: {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    } | undefined;
}, {
    confidence: number;
    provider_a: {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    };
    processing_time_ms: number;
    ip_address: string;
    state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    provider_b?: {
        confidence: number;
        provider: string;
        state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    } | undefined;
    is_vpn_detected?: boolean | undefined;
    is_hosting_detected?: boolean | undefined;
}>;
export type GeoVerificationResult = z.infer<typeof GeoVerificationResult>;
export declare const VideoUrlPattern: z.ZodObject<{
    platform: z.ZodEnum<["zoom", "google_meet", "microsoft_teams", "webex", "doxy", "vsee", "doximity", "ringcentral", "bluejeans", "custom"]>;
    regex: z.ZodString;
    priority: z.ZodNumber;
    example_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    platform: "zoom" | "google_meet" | "microsoft_teams" | "webex" | "doxy" | "vsee" | "doximity" | "ringcentral" | "bluejeans" | "custom";
    regex: string;
    priority: number;
    example_url: string;
}, {
    platform: "zoom" | "google_meet" | "microsoft_teams" | "webex" | "doxy" | "vsee" | "doximity" | "ringcentral" | "bluejeans" | "custom";
    regex: string;
    priority: number;
    example_url: string;
}>;
export type VideoUrlPattern = z.infer<typeof VideoUrlPattern>;
export declare const ExportRow: z.ZodObject<{
    meeting_ref: z.ZodString;
    attendee_slot_hash: z.ZodString;
    status: z.ZodEnum<["verified", "unverified", "assumed_from_prior", "provider_assigned"]>;
    state: z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>;
    within_scope: z.ZodNullable<z.ZodBoolean>;
    timestamp_utc: z.ZodDate;
    method: z.ZodOptional<z.ZodEnum<["auto", "self_declared", "provider_assigned", "assumed"]>>;
    self_declared_state: z.ZodNullable<z.ZodOptional<z.ZodEnum<["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "VI", "GU", "AS", "MP", "Outside U.S."]>>>;
    override_reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    override_timestamp_utc: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    note_text: z.ZodOptional<z.ZodString>;
    license_check_notes: z.ZodOptional<z.ZodString>;
    geo_confidence: z.ZodOptional<z.ZodNumber>;
    schema_version: z.ZodLiteral<1>;
}, "strip", z.ZodTypeAny, {
    status: "verified" | "unverified" | "assumed_from_prior" | "provider_assigned";
    meeting_ref: string;
    attendee_slot_hash: string;
    within_scope: boolean | null;
    timestamp_utc: Date;
    schema_version: 1;
    state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    self_declared_state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | null | undefined;
    method?: "provider_assigned" | "auto" | "self_declared" | "assumed" | undefined;
    override_reason?: string | null | undefined;
    override_timestamp_utc?: Date | null | undefined;
    note_text?: string | undefined;
    license_check_notes?: string | undefined;
    geo_confidence?: number | undefined;
}, {
    status: "verified" | "unverified" | "assumed_from_prior" | "provider_assigned";
    meeting_ref: string;
    attendee_slot_hash: string;
    within_scope: boolean | null;
    timestamp_utc: Date;
    schema_version: 1;
    state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | undefined;
    self_declared_state?: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC" | "PR" | "VI" | "GU" | "AS" | "MP" | "Outside U.S." | null | undefined;
    method?: "provider_assigned" | "auto" | "self_declared" | "assumed" | undefined;
    override_reason?: string | null | undefined;
    override_timestamp_utc?: Date | null | undefined;
    note_text?: string | undefined;
    license_check_notes?: string | undefined;
    geo_confidence?: number | undefined;
}>;
export type ExportRow = z.infer<typeof ExportRow>;
