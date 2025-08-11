import { SignJWT, jwtVerify } from 'jose';
import { createHash, createHmac } from 'crypto';
import { GeoVerificationResult, StateCode } from '@stateid/shared';
import { PERFORMANCE_CONSTANTS } from '@stateid/shared';
import { config } from '../config';

interface TokenPayload {
  sessionId: string;
  originalUrl: string;
  expiresAt: number;
  keyId: string;
}

interface VerificationRecord {
  sessionId: string;
  clientIp: string;
  geoResult?: GeoVerificationResult;
  processingTimeMs: number;
  timestamp: Date;
  isFailOpen: boolean;
  selfDeclaredState?: StateCode;
}

class RedirectService {
  private readonly signingKey: Uint8Array;
  private readonly keyId: string;

  constructor() {
    // Create signing key from config
    this.signingKey = new TextEncoder().encode(config.JWT_SECRET);
    this.keyId = createHash('sha256').update(config.JWT_SECRET).digest('hex').slice(0, 8);
  }

  /**
   * Generate a wrapper token for a meeting URL
   * Implements token TTL from spec: "valid from start−60 minutes to end+12 hours"
   */
  async generateWrapperToken(
    sessionId: string,
    originalUrl: string,
    meetingStartTime: Date,
    meetingEndTime?: Date
  ): Promise<string> {
    try {
      // Calculate token validity window per spec
      const startBuffer = PERFORMANCE_CONSTANTS.TOKEN_TTL_OFFSET_MINUTES * 60 * 1000; // 60 minutes
      const extensionTime = PERFORMANCE_CONSTANTS.TOKEN_TTL_EXTENSION_HOURS * 60 * 60 * 1000; // 12 hours
      
      const validFrom = new Date(meetingStartTime.getTime() - startBuffer);
      const validUntil = meetingEndTime 
        ? new Date(meetingEndTime.getTime() + extensionTime)
        : new Date(meetingStartTime.getTime() + extensionTime);

      const payload: TokenPayload = {
        sessionId,
        originalUrl,
        expiresAt: validUntil.getTime(),
        keyId: this.keyId
      };

      // Create JWT with HMAC signing
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', kid: this.keyId })
        .setIssuedAt()
        .setNotBefore(Math.floor(validFrom.getTime() / 1000))
        .setExpirationTime(Math.floor(validUntil.getTime() / 1000))
        .sign(this.signingKey);

      // Create short, URL-safe token
      const shortToken = this.createShortToken(jwt);
      
      // Cache the full JWT mapped to short token in Redis for fast lookup
      await this.cacheToken(shortToken, jwt);

      return shortToken;

    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error('Failed to generate wrapper token');
    }
  }

  /**
   * Resolve a short token back to original URL and session data
   * Must complete within performance budget for <200ms requirement
   */
  async resolveToken(shortToken: string): Promise<{ originalUrl: string; sessionId: string } | null> {
    try {
      // Fast Redis lookup for the full JWT
      const jwt = await this.getCachedToken(shortToken);
      if (!jwt) {
        return null;
      }

      // Verify and decode the JWT
      const { payload } = await jwtVerify(jwt, this.signingKey);
      const tokenData = payload as unknown as TokenPayload;

      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        await this.removeCachedToken(shortToken);
        return null;
      }

      // Verify key ID for rotation support
      if (tokenData.keyId !== this.keyId) {
        // Check if this is within grace period for key rotation
        const isWithinGracePeriod = await this.isWithinKeyRotationGrace(tokenData.keyId);
        if (!isWithinGracePeriod) {
          await this.removeCachedToken(shortToken);
          return null;
        }
      }

      return {
        originalUrl: tokenData.originalUrl,
        sessionId: tokenData.sessionId
      };

    } catch (error) {
      console.error('Token resolution error:', error);
      return null;
    }
  }

  /**
   * Record a successful verification with geo data
   */
  async recordVerification(
    sessionId: string, 
    clientIp: string, 
    geoResult: GeoVerificationResult,
    processingTimeMs: number
  ): Promise<void> {
    const record: VerificationRecord = {
      sessionId,
      clientIp,
      geoResult,
      processingTimeMs,
      timestamp: new Date(),
      isFailOpen: false
    };

    // Send to calendar service for ledger recording (async)
    void this.sendToCalendarService('verification', record);
  }

  /**
   * Record a fail-open scenario for background processing
   */
  async recordFailOpen(
    sessionId: string,
    clientIp: string,
    processingTimeMs: number
  ): Promise<void> {
    const record: VerificationRecord = {
      sessionId,
      clientIp,
      processingTimeMs,
      timestamp: new Date(),
      isFailOpen: true
    };

    // Send to calendar service for background retry
    void this.sendToCalendarService('fail-open', record);
    
    // Schedule background retry with exponential backoff
    void this.scheduleBackgroundRetry(sessionId, clientIp);
  }

  /**
   * Record client self-declaration (Ask flow)
   */
  async recordSelfDeclaration(
    shortToken: string,
    state: StateCode,
    clientIp: string
  ): Promise<{ originalUrl: string; sessionId: string }> {
    const tokenData = await this.resolveToken(shortToken);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }

    const record: VerificationRecord = {
      sessionId: tokenData.sessionId,
      clientIp,
      processingTimeMs: 0, // Self-declaration has no lookup time
      timestamp: new Date(),
      isFailOpen: false,
      selfDeclaredState: state
    };

    // Send to calendar service
    void this.sendToCalendarService('self-declaration', record);

    return tokenData;
  }

  /**
   * Create a short, URL-safe token from JWT
   */
  private createShortToken(jwt: string): string {
    // Create a short hash of the JWT for the URL
    const hash = createHmac('sha256', this.signingKey)
      .update(jwt)
      .digest('base64url');
    
    // Use first 16 characters for short token
    return hash.slice(0, 16);
  }

  /**
   * Cache token in Redis for fast lookup
   */
  private async cacheToken(shortToken: string, jwt: string): Promise<void> {
    try {
      // Import Redis service
      const { redisService } = await import('./redis-service');
      
      // Cache with TTL matching token expiration
      const ttlSeconds = PERFORMANCE_CONSTANTS.TOKEN_TTL_EXTENSION_HOURS * 60 * 60;
      const success = await redisService.set(`token:${shortToken}`, jwt, ttlSeconds);
      
      if (!success) {
        // Fallback to in-memory cache for development
        if (!global.tokenCache) {
          global.tokenCache = new Map();
        }
        global.tokenCache.set(shortToken, jwt);
        
        setTimeout(() => {
          global.tokenCache?.delete(shortToken);
        }, ttlSeconds * 1000);
      }
      
    } catch (error) {
      console.error('Token caching error:', error);
      
      // Fallback to in-memory cache
      if (!global.tokenCache) {
        global.tokenCache = new Map();
      }
      global.tokenCache.set(shortToken, jwt);
    }
  }

  /**
   * Get cached token from Redis
   */
  private async getCachedToken(shortToken: string): Promise<string | null> {
    try {
      // Import Redis service
      const { redisService } = await import('./redis-service');
      
      const jwt = await redisService.get(`token:${shortToken}`);
      
      if (jwt) {
        return jwt;
      }
      
      // Fallback to in-memory cache
      return global.tokenCache?.get(shortToken) || null;
      
    } catch (error) {
      console.error('Token retrieval error:', error);
      
      // Fallback to in-memory cache
      return global.tokenCache?.get(shortToken) || null;
    }
  }

  /**
   * Remove cached token
   */
  private async removeCachedToken(shortToken: string): Promise<void> {
    try {
      // Import Redis service
      const { redisService } = await import('./redis-service');
      
      await redisService.del(`token:${shortToken}`);
      
      // Also remove from in-memory cache
      global.tokenCache?.delete(shortToken);
      
    } catch (error) {
      console.error('Token removal error:', error);
      
      // Fallback to in-memory cache cleanup
      global.tokenCache?.delete(shortToken);
    }
  }

  /**
   * Check if old key ID is within rotation grace period
   */
  private async isWithinKeyRotationGrace(oldKeyId: string): boolean {
    // In production, check against key rotation history
    // For now, allow 24-hour grace period per spec
    return true; // Simplified for MVP
  }

  /**
   * Send verification data to calendar service
   */
  private async sendToCalendarService(type: string, record: VerificationRecord): Promise<void> {
    try {
      // In production, use HTTP client to send to calendar service
      console.log(`Sending ${type} record to calendar service:`, {
        sessionId: record.sessionId,
        timestamp: record.timestamp,
        isFailOpen: record.isFailOpen,
        processingTime: record.processingTimeMs
      });
      
      // TODO: Implement actual HTTP call to calendar service
      // await axios.post(`${config.CALENDAR_SERVICE_URL}/api/verification`, record);
      
    } catch (error) {
      console.error('Failed to send to calendar service:', error);
    }
  }

  /**
   * Schedule background retry for failed geo lookups
   */
  private async scheduleBackgroundRetry(sessionId: string, clientIp: string): Promise<void> {
    const delays = PERFORMANCE_CONSTANTS.BACKGROUND_RETRY_DELAYS_MS;
    
    for (let i = 0; i < delays.length; i++) {
      setTimeout(async () => {
        try {
          // Import here to avoid circular dependency
          const { geoService } = await import('./geo-service');
          const geoResult = await geoService.verifyLocation(clientIp);
          
          if (geoResult.confidence > 0) {
            // Successful background verification
            await this.recordVerification(sessionId, clientIp, geoResult, geoResult.processing_time_ms);
            return; // Stop retrying on success
          }
        } catch (error) {
          console.error(`Background retry ${i + 1} failed:`, error);
        }
      }, delays[i]);
    }
  }
}

// Export singleton instance
export const redirectService = new RedirectService();

// Declare global type for development token cache
declare global {
  var tokenCache: Map<string, string> | undefined;
}