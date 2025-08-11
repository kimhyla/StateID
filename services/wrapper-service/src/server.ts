import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { geoService } from './services/geo-service';
import { redirectService } from './services/redirect-service';
import { metricsService } from './services/metrics-service';

// Create Fastify instance optimized for speed
const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    prettyPrint: config.NODE_ENV === 'development'
  },
  trustProxy: true, // For accurate client IPs
  disableRequestLogging: !config.ENABLE_REQUEST_LOGGING
});

async function buildServer() {
  try {
    // Register CORS (minimal config for speed)
    await fastify.register(cors, {
      origin: true,
      credentials: false
    });

    // Register rate limiting
    await fastify.register(rateLimit, {
      max: config.RATE_LIMIT_MAX_REQUESTS,
      timeWindow: config.RATE_LIMIT_WINDOW_MS,
      skipOnError: true // Don't fail open on rate limit errors
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'wrapper',
        version: '0.1.0'
      };
    });

    // Main redirect endpoint - CRITICAL PATH
    // This must complete in <200ms per spec requirement
    fastify.get('/r/:token', async (request, reply) => {
      const startTime = Date.now();
      const { token } = request.params as { token: string };
      const clientIp = request.ip;

      try {
        // Start parallel operations for speed
        const [redirectData, geoResult] = await Promise.allSettled([
          redirectService.resolveToken(token),
          geoService.verifyLocation(clientIp)
        ]);

        // Check if we have redirect data
        if (redirectData.status === 'rejected' || !redirectData.value) {
          reply.code(404);
          return { error: 'Invalid or expired link' };
        }

        const { originalUrl, sessionId } = redirectData.value;
        const processingTime = Date.now() - startTime;

        // If geo lookup is taking too long, fail open with redirect
        if (processingTime >= config.FAIL_OPEN_THRESHOLD_MS || geoResult.status === 'rejected') {
          // Record the attempt for background processing
          void redirectService.recordFailOpen(sessionId, clientIp, processingTime);
          
          // Immediate redirect to original URL (fail open)
          reply.redirect(302, originalUrl);
          return;
        }

        // We have geo data within time budget
        const geoData = geoResult.value;
        
        // Record the verification
        void redirectService.recordVerification(sessionId, clientIp, geoData, processingTime);

        // Redirect to original URL
        reply.redirect(302, originalUrl);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        fastify.log.error({ error, token, clientIp, processingTime }, 'Redirect error');
        
        // Try to fail open to original URL if we can resolve token
        try {
          const redirectData = await redirectService.resolveToken(token);
          if (redirectData?.originalUrl) {
            reply.redirect(302, redirectData.originalUrl);
            return;
          }
        } catch {}

        // Ultimate fallback
        reply.code(500);
        return { error: 'Service temporarily unavailable' };
      }
    });

    // Client self-declaration endpoint (Ask flow)
    fastify.post('/declare/:token', async (request, reply) => {
      const { token } = request.params as { token: string };
      const { state } = request.body as { state: string };
      const clientIp = request.ip;

      try {
        const result = await redirectService.recordSelfDeclaration(token, state, clientIp);
        return { success: true, redirectUrl: result.originalUrl };
      } catch (error) {
        fastify.log.error({ error, token, state }, 'Self-declaration error');
        reply.code(400);
        return { error: 'Invalid request' };
      }
    });

    // Metrics endpoint (internal)
    fastify.get('/metrics', async () => {
      return await metricsService.getMetrics();
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      fastify.log.info('Shutting down wrapper service...');
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return fastify;

  } catch (error) {
    fastify.log.error(error, 'Failed to build server');
    throw error;
  }
}

// Start server
async function start() {
  try {
    const server = await buildServer();
    
    await server.listen({ 
      port: config.PORT, 
      host: '0.0.0.0' 
    });
    
    server.log.info(`Wrapper service listening on port ${config.PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildServer };