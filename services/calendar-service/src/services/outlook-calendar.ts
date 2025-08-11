import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import { urlRewriterService, EventMetadata } from './url-rewriter';

export interface OutlookCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  refreshToken: string;
  accessToken?: string;
}

export interface OutlookEvent {
  id: string;
  subject: string;
  body?: string;
  location?: string;
  start: Date;
  end?: Date;
  attendees?: string[];
  calendarId: string;
}

export interface GraphWebhookNotification {
  subscriptionId: string;
  clientState: string;
  expirationDateTime: string;
  resource: string;
  resourceData: any;
  changeType: string;
}

/**
 * Microsoft Outlook Calendar Service
 * 
 * Handles Microsoft Graph API integration including:
 * - OAuth 2.0 authentication with MSAL
 * - Microsoft Graph subscriptions for real-time event monitoring
 * - Automatic URL rewriting in Outlook calendar events
 * - Event metadata storage with rollback safety
 */
export class OutlookCalendarService {
  private msalApp: ConfidentialClientApplication;
  private graphClient: Client;
  private isInitialized = false;
  private currentAccessToken?: string;

  constructor(private credentials: OutlookCredentials) {
    // Initialize MSAL application
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        authority: `https://login.microsoftonline.com/${credentials.tenantId}`
      }
    });

    // Initialize Graph client
    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const token = await this.getAccessToken();
          done(null, token);
        } catch (error) {
          done(error, null);
        }
      }
    });
  }

  /**
   * Initialize the service and get access token
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.currentAccessToken = await this.getAccessToken();
      this.isInitialized = true;
      console.log('Outlook Calendar service initialized');
    } catch (error) {
      console.error('Failed to initialize Outlook Calendar service:', error);
      throw error;
    }
  }

  /**
   * Get access token using refresh token
   */
  private async getAccessToken(): Promise<string> {
    try {
      if (this.credentials.accessToken) {
        // TODO: Check if token is still valid
        return this.credentials.accessToken;
      }

      // Use refresh token to get new access token
      const refreshTokenRequest = {
        refreshToken: this.credentials.refreshToken,
        scopes: ['https://graph.microsoft.com/Calendars.ReadWrite']
      };

      const response = await this.msalApp.acquireTokenByRefreshToken(refreshTokenRequest);
      return response!.accessToken;

    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }

  /**
   * Set up Microsoft Graph subscription for calendar changes
   */
  async setupWebhook(calendarId: string, webhookUrl: string): Promise<{
    subscriptionId: string;
    resource: string;
    expirationDateTime: Date;
  }> {
    await this.initialize();

    const clientState = require('crypto').randomBytes(32).toString('hex');
    
    // Microsoft Graph subscription for calendar events
    const subscription = {
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource: calendarId === 'primary' ? '/me/events' : `/me/calendars/${calendarId}/events`,
      expirationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      clientState,
      includeResourceData: false
    };

    try {
      const response = await this.graphClient
        .api('/subscriptions')
        .post(subscription);

      console.log(`Microsoft Graph webhook setup for calendar ${calendarId}:`, {
        subscriptionId: response.id,
        resource: response.resource,
        expirationDateTime: response.expirationDateTime
      });

      return {
        subscriptionId: response.id,
        resource: response.resource,
        expirationDateTime: new Date(response.expirationDateTime)
      };

    } catch (error) {
      console.error('Failed to setup Microsoft Graph webhook:', error);
      throw error;
    }
  }

  /**
   * Process webhook notification from Microsoft Graph
   */
  async processWebhookNotification(notification: GraphWebhookNotification): Promise<void> {
    console.log('Processing Microsoft Graph webhook:', notification);

    try {
      // Extract event ID from resource path
      const eventId = this.extractEventIdFromResource(notification.resource);
      
      if (eventId && notification.changeType !== 'deleted') {
        await this.processEventUpdate(eventId, notification.resource);
      }

    } catch (error) {
      console.error('Failed to process webhook notification:', error);
      throw error;
    }
  }

  /**
   * Process individual event update
   */
  private async processEventUpdate(eventId: string, resourcePath: string): Promise<void> {
    try {
      // Get the full event details
      const event = await this.graphClient
        .api(resourcePath)
        .get();

      // Skip if event doesn't have video meeting potential
      if (!this.eventHasPotentialVideoUrl(event)) {
        return;
      }

      // Check if already processed (idempotence)
      const originalUrl = event.extensions?.find((ext: any) => ext.id === 'stateid_original_url')?.value;
      if (originalUrl) {
        console.log(`Event ${eventId} already processed, skipping`);
        return;
      }

      const calendarId = this.extractCalendarIdFromResource(resourcePath);
      const metadata: EventMetadata = {
        eventId,
        calendarId,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        attendees: event.attendees?.map((a: any) => a.emailAddress.address).filter(Boolean)
      };

      // Attempt to rewrite URLs
      const rewriteResult = await urlRewriterService.rewriteCalendarEvent(
        event.location?.displayName || null,
        event.body?.content || null,
        metadata
      );

      // Update event if changes were made
      if (rewriteResult.sessionData) {
        await this.updateEventWithStateIdWrapper(
          eventId,
          resourcePath,
          event,
          rewriteResult.location,
          rewriteResult.description,
          rewriteResult.sessionData
        );

        console.log(`Successfully wrapped URL in Outlook event ${eventId}:`, {
          platform: rewriteResult.sessionData.platform,
          sessionId: rewriteResult.sessionData.sessionId
        });
      }

    } catch (error) {
      console.error(`Failed to process Outlook event ${eventId}:`, error);
      // Don't throw - continue processing other events
    }
  }

  /**
   * Update Outlook event with StateID wrapper URL
   * Uses Microsoft Graph extensions to store metadata
   */
  private async updateEventWithStateIdWrapper(
    eventId: string,
    resourcePath: string,
    originalEvent: any,
    newLocation: string | null,
    newDescription: string | null,
    sessionData: any
  ): Promise<void> {

    const updateData: any = {};

    // Update location if changed
    if (newLocation !== null) {
      updateData.location = {
        displayName: newLocation,
        locationType: originalEvent.location?.locationType || 'default'
      };
    }

    // Update body/description if changed
    if (newDescription !== null) {
      updateData.body = {
        contentType: originalEvent.body?.contentType || 'html',
        content: newDescription
      };
    }

    try {
      // Update the event
      await this.graphClient
        .api(resourcePath)
        .patch(updateData);

      // Add StateID metadata as extensions
      const extensions = [
        {
          '@odata.type': 'microsoft.graph.openTypeExtension',
          extensionName: 'com.stateid.metadata',
          stateid_original_url: sessionData.originalUrl,
          stateid_session_id: sessionData.sessionId,
          stateid_platform: sessionData.platform,
          stateid_wrapped_at: new Date().toISOString()
        }
      ];

      // Microsoft Graph doesn't support extensions in PATCH, so we use POST
      await this.graphClient
        .api(`${resourcePath}/extensions`)
        .post(extensions[0]);

      console.log(`Outlook event ${eventId} updated with StateID wrapper`);

    } catch (error) {
      console.error(`Failed to update Outlook event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Check if event might contain a video meeting URL
   */
  private eventHasPotentialVideoUrl(event: any): boolean {
    const location = event.location?.displayName || '';
    const description = event.body?.content || '';
    
    // Quick pre-check for video meeting indicators
    const videoIndicators = [
      'zoom.us', 'meet.google.com', 'teams.microsoft.com', 'webex.com',
      'doxy.me', 'vsee.com', 'doximity.com', 'ringcentral.com', 'bluejeans.com',
      'https://', 'http://'
    ];

    const text = (location + ' ' + description).toLowerCase();
    return videoIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Get calendar events for a specific time range
   */
  async getEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<OutlookEvent[]> {
    await this.initialize();

    const resource = calendarId === 'primary' ? '/me/events' : `/me/calendars/${calendarId}/events`;

    try {
      const response = await this.graphClient
        .api(resource)
        .filter(`start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`)
        .orderby('start/dateTime')
        .get();

      return (response.value || []).map((event: any) => ({
        id: event.id,
        subject: event.subject || '',
        body: event.body?.content,
        location: event.location?.displayName,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        attendees: event.attendees?.map((a: any) => a.emailAddress.address).filter(Boolean),
        calendarId
      }));

    } catch (error) {
      console.error('Failed to get Outlook calendar events:', error);
      throw error;
    }
  }

  /**
   * Remove StateID wrapper and restore original URL (rollback)
   */
  async rollbackEvent(eventId: string, calendarId: string): Promise<void> {
    await this.initialize();

    const resource = calendarId === 'primary' ? `/me/events/${eventId}` : `/me/calendars/${calendarId}/events/${eventId}`;

    try {
      // Get event with extensions
      const event = await this.graphClient
        .api(resource)
        .expand('extensions')
        .get();

      // Find StateID extension
      const stateIdExtension = event.extensions?.find((ext: any) => 
        ext.extensionName === 'com.stateid.metadata'
      );

      if (!stateIdExtension?.stateid_original_url) {
        console.log(`No StateID wrapper found in Outlook event ${eventId}`);
        return;
      }

      const originalUrl = stateIdExtension.stateid_original_url;

      // Restore original URL
      const updateData: any = {};

      if (event.location?.displayName?.includes('stateid.app/r/')) {
        updateData.location = {
          displayName: event.location.displayName.replace(/https:\/\/stateid\.app\/r\/[a-zA-Z0-9_-]+/, originalUrl),
          locationType: event.location.locationType
        };
      }

      if (event.body?.content?.includes('stateid.app/r/')) {
        updateData.body = {
          contentType: event.body.contentType,
          content: event.body.content.replace(/https:\/\/stateid\.app\/r\/[a-zA-Z0-9_-]+/, originalUrl)
        };
      }

      // Update event
      if (Object.keys(updateData).length > 0) {
        await this.graphClient
          .api(resource)
          .patch(updateData);
      }

      // Remove StateID extension
      await this.graphClient
        .api(`${resource}/extensions/${stateIdExtension.id}`)
        .delete();

      console.log(`Outlook event ${eventId} rolled back to original URL`);

    } catch (error) {
      console.error(`Failed to rollback Outlook event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Stop Microsoft Graph subscription
   */
  async stopWebhook(subscriptionId: string): Promise<void> {
    try {
      await this.graphClient
        .api(`/subscriptions/${subscriptionId}`)
        .delete();

      console.log(`Stopped Microsoft Graph webhook ${subscriptionId}`);

    } catch (error) {
      console.error(`Failed to stop webhook ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Extract event ID from Microsoft Graph resource path
   */
  private extractEventIdFromResource(resource: string): string | null {
    const match = resource.match(/events\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract calendar ID from Microsoft Graph resource path
   */
  private extractCalendarIdFromResource(resource: string): string {
    const match = resource.match(/calendars\/([^\/]+)/);
    return match ? match[1] : 'primary';
  }
}