import axios from 'axios';
import { Reader } from 'maxmind';
import { GeoVerificationResult, StateCode } from '@stateid/shared';
import { GEO_CONFIDENCE_THRESHOLDS } from '@stateid/shared';
import { config } from '../config';

interface GeoProvider {
  name: string;
  lookup(ip: string): Promise<{ state?: StateCode; confidence: number }>;
}

// MaxMind GeoLite2 provider (local database)
class MaxMindProvider implements GeoProvider {
  name = 'maxmind';
  private reader: Reader<any> | null = null;

  async init() {
    try {
      if (config.MAXMIND_LICENSE_KEY) {
        // In production, download and cache the database
        this.reader = await Reader.open(config.MAXMIND_DATABASE_PATH);
      }
    } catch (error) {
      console.warn('MaxMind database not available:', error);
    }
  }

  async lookup(ip: string): Promise<{ state?: StateCode; confidence: number }> {
    if (!this.reader) {
      return { confidence: 0 };
    }

    try {
      const result = this.reader.get(ip);
      if (result?.subdivisions?.[0]?.iso_code) {
        const state = result.subdivisions[0].iso_code as StateCode;
        // MaxMind confidence based on accuracy radius
        const accuracy = result.location?.accuracy_radius || 1000;
        const confidence = Math.max(0.5, Math.min(0.95, 1 - (accuracy / 1000)));
        
        return { state, confidence };
      }
    } catch (error) {
      console.error('MaxMind lookup error:', error);
    }

    return { confidence: 0 };
  }
}

// IP2Location provider (API-based)
class IP2LocationProvider implements GeoProvider {
  name = 'ip2location';

  async lookup(ip: string): Promise<{ state?: StateCode; confidence: number }> {
    if (!config.IP2LOCATION_API_KEY) {
      return { confidence: 0 };
    }

    try {
      const response = await axios.get(
        `https://api.ip2location.com/v2/?ip=${ip}&key=${config.IP2LOCATION_API_KEY}&package=WS24`,
        { timeout: 150 } // Leave buffer for other operations
      );

      const data = response.data;
      if (data.region_name && data.country_code === 'US') {
        // Map region name to state code
        const state = this.mapRegionToState(data.region_name);
        if (state) {
          // IP2Location confidence based on response quality
          const confidence = data.is_proxy === 'Yes' ? 0.3 : 0.85;
          return { state, confidence };
        }
      }
    } catch (error) {
      console.error('IP2Location lookup error:', error);
    }

    return { confidence: 0 };
  }

  private mapRegionToState(regionName: string): StateCode | undefined {
    const stateMap: Record<string, StateCode> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
      'Puerto Rico': 'PR', 'Virgin Islands': 'VI', 'Guam': 'GU'
    };

    return stateMap[regionName];
  }
}

// IPGeolocation provider (fallback)
class IPGeolocationProvider implements GeoProvider {
  name = 'ipgeolocation';

  async lookup(ip: string): Promise<{ state?: StateCode; confidence: number }> {
    if (!config.IPGEOLOCATION_API_KEY) {
      return { confidence: 0 };
    }

    try {
      const response = await axios.get(
        `https://api.ipgeolocation.io/ipgeo?apiKey=${config.IPGEOLOCATION_API_KEY}&ip=${ip}`,
        { timeout: 150 }
      );

      const data = response.data;
      if (data.state_prov && data.country_code2 === 'US') {
        const state = data.state_prov as StateCode;
        // Lower confidence for fallback provider
        const confidence = data.isp?.includes('hosting') ? 0.3 : 0.75;
        return { state, confidence };
      }
    } catch (error) {
      console.error('IPGeolocation lookup error:', error);
    }

    return { confidence: 0 };
  }
}

class GeoService {
  private providers: GeoProvider[] = [];
  private initialized = false;

  constructor() {
    this.providers = [
      new MaxMindProvider(),
      new IP2LocationProvider(),
      new IPGeolocationProvider()
    ];
  }

  async init() {
    if (this.initialized) return;

    // Initialize MaxMind database
    const maxmindProvider = this.providers.find(p => p.name === 'maxmind') as MaxMindProvider;
    await maxmindProvider.init();

    this.initialized = true;
  }

  async verifyLocation(ip: string): Promise<GeoVerificationResult> {
    const startTime = Date.now();

    // Skip geo verification in development if configured
    if (config.IS_DEVELOPMENT && config.SKIP_GEO_VERIFICATION) {
      return {
        state: 'CT', // Mock Connecticut for development
        confidence: 0.9,
        provider_a: { state: 'CT', confidence: 0.9, provider: 'mock' },
        is_vpn_detected: false,
        is_hosting_detected: false,
        processing_time_ms: 10,
        ip_address: ip
      };
    }

    try {
      await this.init();

      // Run multiple providers in parallel for confidence scoring
      const results = await Promise.allSettled([
        this.providers[0].lookup(ip), // MaxMind (Provider A)
        this.providers[1].lookup(ip)  // IP2Location (Provider B)
      ]);

      const providerA = results[0].status === 'fulfilled' ? results[0].value : { confidence: 0 };
      const providerB = results[1].status === 'fulfilled' ? results[1].value : { confidence: 0 };

      const processingTime = Date.now() - startTime;

      // Apply confidence rules from spec §11
      const finalResult = this.calculateFinalResult(providerA, providerB, ip, processingTime);

      return finalResult;

    } catch (error) {
      console.error('Geo verification error:', error);
      
      return {
        confidence: 0,
        provider_a: { confidence: 0, provider: 'error' },
        is_vpn_detected: false,
        is_hosting_detected: true, // Assume hosting on error
        processing_time_ms: Date.now() - startTime,
        ip_address: ip
      };
    }
  }

  private calculateFinalResult(
    providerA: { state?: StateCode; confidence: number },
    providerB: { state?: StateCode; confidence: number },
    ip: string,
    processingTime: number
  ): GeoVerificationResult {
    
    // Detect VPN/hosting patterns
    const isVpnDetected = this.detectVpn(ip);
    const isHostingDetected = this.detectHosting(ip);

    let finalState: StateCode | undefined;
    let finalConfidence = 0;

    // Apply confidence rules from spec §11:
    // "Verified (auto) when Provider A confidence ≥ 0.80 and Provider B agrees or is unknown"
    if (providerA.confidence >= GEO_CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE) {
      if (!providerB.state || providerB.state === providerA.state) {
        finalState = providerA.state;
        finalConfidence = providerA.confidence;
      }
    }
    // "Or when Provider A confidence is 0.60–0.79 and Provider B agrees on the exact same state"
    else if (
      providerA.confidence >= GEO_CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE &&
      providerA.confidence < GEO_CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE &&
      providerB.state === providerA.state
    ) {
      finalState = providerA.state;
      finalConfidence = Math.min(providerA.confidence, providerB.confidence);
    }

    // If VPN/hosting detected, always mark as unverified per spec
    if (isVpnDetected || isHostingDetected) {
      finalState = undefined;
      finalConfidence = 0;
    }

    return {
      state: finalState,
      confidence: finalConfidence,
      provider_a: {
        state: providerA.state,
        confidence: providerA.confidence,
        provider: this.providers[0].name
      },
      provider_b: providerB.confidence > 0 ? {
        state: providerB.state,
        confidence: providerB.confidence,
        provider: this.providers[1].name
      } : undefined,
      is_vpn_detected: isVpnDetected,
      is_hosting_detected: isHostingDetected,
      processing_time_ms: processingTime,
      ip_address: ip
    };
  }

  private detectVpn(ip: string): boolean {
    // Simple VPN detection patterns
    const vpnPatterns = [
      /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,  // Private IPs
      /^169\.254\./, // Link-local
      /^127\./ // Loopback
    ];

    return vpnPatterns.some(pattern => pattern.test(ip));
  }

  private detectHosting(ip: string): boolean {
    // Basic hosting detection - in production, use more sophisticated methods
    const hostingPatterns = [
      /amazonaws\.com/, /googleusercontent\.com/, /azure\.com/,
      /digitalocean\.com/, /linode\.com/, /vultr\.com/
    ];

    // This is a simplified check - real implementation would use
    // reverse DNS lookup and known hosting IP ranges
    return false; // Placeholder for now
  }
}

// Export singleton instance
export const geoService = new GeoService();