import { VIDEO_URL_PATTERNS, VideoPlatform } from '@stateid/shared';
import { v4 as uuidv4 } from 'uuid';

export interface DetectedUrl {
  platform: VideoPlatform;
  originalUrl: string;
  startIndex: number;
  endIndex: number;
  priority: number;
}

export interface RewriteResult {
  originalText: string;
  rewrittenText: string;
  detectedUrls: DetectedUrl[];
  wrappedUrl?: string;
  sessionId: string;
  hasChanges: boolean;
}

export interface EventMetadata {
  eventId: string;
  calendarId: string;
  startTime: Date;
  endTime?: Date;
  attendees?: string[];
}

/**
 * URL Rewriter Service
 * 
 * Detects video meeting URLs in calendar events and replaces them with StateID wrapper URLs.
 * Implements the priority system from spec: Location > Description, Zoom > Teams > Meet > Webex > others
 */
export class UrlRewriterService {
  private wrapperServiceUrl: string;

  constructor(wrapperServiceUrl: string = 'https://stateid.app') {
    this.wrapperServiceUrl = wrapperServiceUrl;
  }

  /**
   * Detect video meeting URLs in text content
   * Implements priority system from spec §5.1
   */
  detectVideoUrls(text: string): DetectedUrl[] {
    const detectedUrls: DetectedUrl[] = [];

    // Sort patterns by priority (Zoom=1, Teams=2, Meet=3, etc.)
    const sortedPatterns = [...VIDEO_URL_PATTERNS].sort((a, b) => a.priority - b.priority);

    for (const pattern of sortedPatterns) {
      const regex = new RegExp(pattern.regex, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const url = match[0];
        
        // Check if this URL overlaps with an already detected higher-priority URL
        const overlaps = detectedUrls.some(existing => 
          (match.index >= existing.startIndex && match.index < existing.endIndex) ||
          (match.index + url.length > existing.startIndex && match.index + url.length <= existing.endIndex)
        );

        if (!overlaps) {
          detectedUrls.push({
            platform: pattern.platform,
            originalUrl: url,
            startIndex: match.index,
            endIndex: match.index + url.length,
            priority: pattern.priority
          });
        }
      }
    }

    // Sort by start index for consistent processing
    return detectedUrls.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Rewrite calendar event content with StateID wrapper URLs
   * Implements spec requirements: Location field takes precedence over Description
   */
  async rewriteCalendarEvent(
    location: string | null,
    description: string | null,
    metadata: EventMetadata
  ): Promise<{ location: string | null; description: string | null; sessionData?: any }> {
    
    let sessionData: any = null;

    // Priority 1: Check Location field first (per spec)
    if (location) {
      const locationResult = await this.rewriteText(location, metadata);
      if (locationResult.hasChanges) {
        sessionData = {
          sessionId: locationResult.sessionId,
          originalUrl: locationResult.detectedUrls[0]?.originalUrl,
          platform: locationResult.detectedUrls[0]?.platform
        };
        
        return {
          location: locationResult.rewrittenText,
          description,
          sessionData
        };
      }
    }

    // Priority 2: Check Description field if no URL found in Location
    if (description) {
      const descriptionResult = await this.rewriteText(description, metadata);
      if (descriptionResult.hasChanges) {
        sessionData = {
          sessionId: descriptionResult.sessionId,
          originalUrl: descriptionResult.detectedUrls[0]?.originalUrl,
          platform: descriptionResult.detectedUrls[0]?.platform
        };

        return {
          location,
          description: descriptionResult.rewrittenText,
          sessionData
        };
      }
    }

    // No video URLs found - return unchanged
    return { location, description };
  }

  /**
   * Rewrite text content with wrapper URLs
   * Wraps only the FIRST match to avoid multiple wrapping per spec
   */
  async rewriteText(text: string, metadata: EventMetadata): Promise<RewriteResult> {
    const detectedUrls = this.detectVideoUrls(text);
    
    if (detectedUrls.length === 0) {
      return {
        originalText: text,
        rewrittenText: text,
        detectedUrls: [],
        sessionId: uuidv4(),
        hasChanges: false
      };
    }

    // Use the first (highest priority) detected URL
    const targetUrl = detectedUrls[0];
    const sessionId = uuidv4();

    try {
      // Generate wrapper token by calling wrapper service
      const wrapperToken = await this.generateWrapperToken(
        sessionId,
        targetUrl.originalUrl,
        metadata.startTime,
        metadata.endTime
      );

      const wrapperUrl = `${this.wrapperServiceUrl}/r/${wrapperToken}`;

      // Replace only the first occurrence
      const rewrittenText = text.substring(0, targetUrl.startIndex) + 
                           wrapperUrl + 
                           text.substring(targetUrl.endIndex);

      return {
        originalText: text,
        rewrittenText,
        detectedUrls,
        wrappedUrl: wrapperUrl,
        sessionId,
        hasChanges: true
      };

    } catch (error) {
      console.error('Failed to generate wrapper token:', error);
      
      // Return unchanged on error
      return {
        originalText: text,
        rewrittenText: text,
        detectedUrls,
        sessionId,
        hasChanges: false
      };
    }
  }

  /**
   * Generate wrapper token via wrapper service
   */
  private async generateWrapperToken(
    sessionId: string,
    originalUrl: string,
    startTime: Date,
    endTime?: Date
  ): Promise<string> {
    // In production, this would call the wrapper service HTTP API
    // For demo, we'll simulate token generation
    
    const mockToken = this.createMockToken(sessionId, originalUrl);
    
    // TODO: Replace with actual HTTP call to wrapper service
    // const response = await axios.post(`${this.wrapperServiceUrl}/api/generate-token`, {
    //   sessionId,
    //   originalUrl,
    //   startTime: startTime.toISOString(),
    //   endTime: endTime?.toISOString()
    // });
    // return response.data.token;
    
    return mockToken;
  }

  /**
   * Create mock token for demonstration
   */
  private createMockToken(sessionId: string, originalUrl: string): string {
    // Simple deterministic token for demo
    const hash = require('crypto')
      .createHash('sha256')
      .update(sessionId + originalUrl)
      .digest('base64url');
    
    return hash.slice(0, 16);
  }

  /**
   * Validate that a URL matches known video platform patterns
   */
  isVideoMeetingUrl(url: string): { isValid: boolean; platform?: VideoPlatform } {
    for (const pattern of VIDEO_URL_PATTERNS) {
      const regex = new RegExp(pattern.regex, 'i');
      if (regex.test(url)) {
        return { isValid: true, platform: pattern.platform };
      }
    }
    return { isValid: false };
  }

  /**
   * Extract original URL from event metadata (for rollback)
   */
  extractOriginalUrl(eventExtendedProperties: Record<string, any>): string | null {
    return eventExtendedProperties?.['stateid_original_url'] || null;
  }

  /**
   * Create idempotence key for event updates
   * Per spec: (calendarId, eventId, occurrenceStartUtc, urlFingerprint)
   */
  createIdempotenceKey(metadata: EventMetadata, urlFingerprint: string): string {
    const keyParts = [
      metadata.calendarId,
      metadata.eventId,
      metadata.startTime.toISOString(),
      urlFingerprint
    ];
    
    return require('crypto')
      .createHash('sha256')
      .update(keyParts.join('|'))
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Create URL fingerprint for idempotence checking
   */
  createUrlFingerprint(url: string): string {
    return require('crypto')
      .createHash('md5')
      .update(url)
      .digest('hex')
      .slice(0, 8);
  }
}

export const urlRewriterService = new UrlRewriterService();