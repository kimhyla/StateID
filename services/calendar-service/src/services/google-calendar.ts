import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { urlRewriterService, EventMetadata } from './url-rewriter';

export interface GoogleCalendarCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  accessToken?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  attendees?: string[];
  calendarId: string;
}

export interface WebhookNotification {
  channelId: string;
  channelToken: string;
  resourceId: string;
  resourceUri: string;
  eventType: string;
  eventId?: string;
}

/**
 * Google Calendar Service
 * 
 * Handles Google Calendar API integration including:
 * - OAuth authentication
 * - Webhook subscriptions for real-time event monitoring
 * - Automatic URL rewriting in calendar events
 * - Event metadata storage with rollback safety
 */
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;
  private isInitialized = false;

  constructor(private credentials: GoogleCalendarCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    // Set credentials
    this.oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
      access_token: credentials.accessToken
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Initialize the service and refresh tokens if needed
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Refresh access token if expired
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      
      this.isInitialized = true;
      console.log('Google Calendar service initialized');
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
      throw error;
    }
  }

  /**
   * Set up webhook subscription for calendar changes
   * Implements Google Calendar API push notifications
   */
  async setupWebhook(calendarId: string, webhookUrl: string): Promise<{
    channelId: string;
    resourceId: string;
    expiration: Date;
  }> {
    await this.initialize();

    const channelId = `stateid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const webhookToken = require('crypto').randomBytes(32).toString('hex');

    try {
      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: webhookToken,
          params: {
            ttl: '86400' // 24 hours
          }
        }
      });

      const expiration = new Date(parseInt(response.data.expiration!));

      console.log(`Google Calendar webhook setup for calendar ${calendarId}:`, {
        channelId,
        resourceId: response.data.resourceId,
        expiration
      });

      return {
        channelId,
        resourceId: response.data.resourceId!,
        expiration
      };

    } catch (error) {
      console.error('Failed to setup Google Calendar webhook:', error);
      throw error;
    }
  }

  /**
   * Process webhook notification from Google Calendar
   */
  async processWebhookNotification(notification: WebhookNotification): Promise<void> {
    console.log('Processing Google Calendar webhook:', notification);

    try {
      // Get the list of changed events since last sync
      const response = await this.calendar.events.list({
        calendarId: notification.resourceId,
        updatedMin: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Last 5 minutes
        singleEvents: true,
        orderBy: 'updated'
      });

      const events = response.data.items || [];

      for (const event of events) {
        if (event.id && event.start?.dateTime) {
          await this.processEventUpdate(event, notification.resourceId);
        }
      }

    } catch (error) {
      console.error('Failed to process webhook notification:', error);
      throw error;
    }
  }

  /**
   * Process individual event update
   * Implements automatic URL rewriting with rollback safety
   */
  private async processEventUpdate(
    event: calendar_v3.Schema$Event,
    calendarId: string
  ): Promise<void> {
    
    // Skip if event doesn't have video meeting potential
    if (!this.eventHasPotentialVideoUrl(event)) {
      return;
    }

    // Check if this event was already processed (idempotence)
    const originalUrl = event.extendedProperties?.private?.['stateid_original_url'];
    if (originalUrl) {
      console.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    const metadata: EventMetadata = {
      eventId: event.id!,
      calendarId,
      startTime: new Date(event.start!.dateTime!),
      endTime: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
      attendees: event.attendees?.map(a => a.email!).filter(Boolean)
    };

    try {
      // Attempt to rewrite URLs in the event
      const rewriteResult = await urlRewriterService.rewriteCalendarEvent(
        event.location || null,
        event.description || null,
        metadata
      );

      // If changes were made, update the event
      if (rewriteResult.sessionData) {
        await this.updateEventWithStateIdWrapper(
          event,
          calendarId,
          rewriteResult.location,
          rewriteResult.description,
          rewriteResult.sessionData
        );

        console.log(`Successfully wrapped URL in event ${event.id}:`, {
          platform: rewriteResult.sessionData.platform,
          sessionId: rewriteResult.sessionData.sessionId
        });
      }

    } catch (error) {
      console.error(`Failed to process event ${event.id}:`, error);
      // Don't throw - continue processing other events
    }
  }

  /**
   * Update calendar event with StateID wrapper URL
   * Stores original URL in extended properties for rollback safety
   */
  private async updateEventWithStateIdWrapper(
    event: calendar_v3.Schema$Event,
    calendarId: string,
    newLocation: string | null,
    newDescription: string | null,
    sessionData: any
  ): Promise<void> {

    const updateData: calendar_v3.Schema$Event = {
      location: newLocation || event.location,
      description: newDescription || event.description,
      extendedProperties: {
        ...event.extendedProperties,
        private: {
          ...event.extendedProperties?.private,
          'stateid_original_url': sessionData.originalUrl,
          'stateid_session_id': sessionData.sessionId,
          'stateid_platform': sessionData.platform,
          'stateid_wrapped_at': new Date().toISOString()
        }
      }
    };

    try {
      await this.calendar.events.patch({
        calendarId,
        eventId: event.id!,
        requestBody: updateData,
        // Critical: Do not send updates to attendees per spec requirement
        sendUpdates: 'none'
      });

      console.log(`Event ${event.id} updated with StateID wrapper`);

    } catch (error) {
      console.error(`Failed to update event ${event.id}:`, error);
      throw error;
    }
  }

  /**
   * Check if event might contain a video meeting URL
   */
  private eventHasPotentialVideoUrl(event: calendar_v3.Schema$Event): boolean {
    const location = event.location || '';
    const description = event.description || '';
    
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
  ): Promise<CalendarEvent[]> {
    await this.initialize();

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return (response.data.items || []).map(event => ({
        id: event.id!,
        summary: event.summary || '',
        description: event.description,
        location: event.location,
        start: new Date(event.start!.dateTime || event.start!.date!),
        end: event.end ? new Date(event.end.dateTime || event.end.date!) : undefined,
        attendees: event.attendees?.map(a => a.email!).filter(Boolean),
        calendarId
      }));

    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  /**
   * Remove StateID wrapper and restore original URL (rollback)
   */
  async rollbackEvent(eventId: string, calendarId: string): Promise<void> {
    await this.initialize();

    try {
      const event = await this.calendar.events.get({
        calendarId,
        eventId
      });

      const originalUrl = event.data.extendedProperties?.private?.['stateid_original_url'];
      
      if (!originalUrl) {
        console.log(`No StateID wrapper found in event ${eventId}`);
        return;
      }

      // Restore original URL
      const location = event.data.location;
      const description = event.data.description;

      let restoredLocation = location;
      let restoredDescription = description;

      // Find and replace StateID wrapper URL with original
      if (location && location.includes('stateid.app/r/')) {
        restoredLocation = location.replace(/https:\/\/stateid\.app\/r\/[a-zA-Z0-9_-]+/, originalUrl);
      }

      if (description && description.includes('stateid.app/r/')) {
        restoredDescription = description.replace(/https:\/\/stateid\.app\/r\/[a-zA-Z0-9_-]+/, originalUrl);
      }

      // Remove StateID metadata
      const cleanExtendedProperties = { ...event.data.extendedProperties };
      if (cleanExtendedProperties.private) {
        delete cleanExtendedProperties.private['stateid_original_url'];
        delete cleanExtendedProperties.private['stateid_session_id'];
        delete cleanExtendedProperties.private['stateid_platform'];
        delete cleanExtendedProperties.private['stateid_wrapped_at'];
      }

      await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          location: restoredLocation,
          description: restoredDescription,
          extendedProperties: cleanExtendedProperties
        },
        sendUpdates: 'none'
      });

      console.log(`Event ${eventId} rolled back to original URL`);

    } catch (error) {
      console.error(`Failed to rollback event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Stop webhook subscription
   */
  async stopWebhook(channelId: string, resourceId: string): Promise<void> {
    try {
      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId
        }
      });

      console.log(`Stopped Google Calendar webhook ${channelId}`);

    } catch (error) {
      console.error(`Failed to stop webhook ${channelId}:`, error);
      throw error;
    }
  }
}