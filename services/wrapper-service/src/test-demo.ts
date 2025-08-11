import { redirectService } from './services/redirect-service';
import { geoService } from './services/geo-service';
import { metricsService } from './services/metrics-service';

/**
 * Demo script to test the core wrapper service functionality
 * This simulates the complete flow from token generation to verification
 */
async function demoWrapperService() {
  console.log('🚀 StateID Wrapper Service Demo\n');

  // 1. Simulate token generation for a Zoom meeting
  console.log('📅 Step 1: Generate wrapper token for Zoom meeting');
  const sessionId = 'session-123-abc';
  const originalZoomUrl = 'https://zoom.us/j/1234567890?pwd=example';
  const meetingStart = new Date(Date.now() + 60000); // 1 minute from now
  const meetingEnd = new Date(Date.now() + 3660000); // 1 hour 1 minute from now

  try {
    const wrapperToken = await redirectService.generateWrapperToken(
      sessionId,
      originalZoomUrl,
      meetingStart,
      meetingEnd
    );
    
    console.log(`✅ Generated wrapper token: ${wrapperToken}`);
    console.log(`🔗 Wrapper URL would be: https://stateid.app/r/${wrapperToken}\n`);

    // 2. Simulate client clicking the wrapper link
    console.log('👆 Step 2: Client clicks wrapper link - resolving token');
    const resolved = await redirectService.resolveToken(wrapperToken);
    
    if (resolved) {
      console.log(`✅ Token resolved successfully`);
      console.log(`📍 Original URL: ${resolved.originalUrl}`);
      console.log(`🆔 Session ID: ${resolved.sessionId}\n`);
    }

    // 3. Simulate geo-location verification
    console.log('🌍 Step 3: Perform geo-location verification');
    const clientIp = '203.0.113.1'; // Example IP address
    
    const startTime = Date.now();
    const geoResult = await geoService.verifyLocation(clientIp);
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log(`🎯 Confidence: ${geoResult.confidence.toFixed(2)}`);
    
    if (geoResult.state) {
      console.log(`📍 Detected state: ${geoResult.state}`);
    } else {
      console.log('❌ Could not determine state');
    }
    
    console.log(`🔍 VPN detected: ${geoResult.is_vpn_detected ? 'Yes' : 'No'}`);
    console.log(`🏢 Hosting detected: ${geoResult.is_hosting_detected ? 'Yes' : 'No'}\n`);

    // 4. Record verification metrics
    console.log('📊 Step 4: Record metrics and verification');
    
    if (resolved) {
      if (processingTime <= 200 && geoResult.confidence > 0.6) {
        // Successful verification within SLA
        await redirectService.recordVerification(
          resolved.sessionId,
          clientIp,
          geoResult,
          processingTime
        );
        console.log('✅ Verification recorded successfully');
      } else {
        // Failed or slow verification - record fail-open
        await redirectService.recordFailOpen(
          resolved.sessionId,
          clientIp,
          processingTime
        );
        console.log('⚠️  Fail-open recorded (slow or low confidence)');
      }
    }

    // Record metrics
    metricsService.recordRedirectLatency(processingTime, { 
      result: geoResult.confidence > 0.6 ? 'success' : 'fail_open' 
    });
    
    if (geoResult.provider_a) {
      metricsService.recordGeoProviderLatency(
        geoResult.provider_a.provider,
        geoResult.processing_time_ms,
        geoResult.provider_a.confidence > 0
      );
    }

    // 5. Demonstrate self-declaration flow
    console.log('\n💬 Step 5: Simulate client self-declaration (Ask flow)');
    try {
      const declaredResult = await redirectService.recordSelfDeclaration(
        wrapperToken,
        'CA', // Client declares California
        clientIp
      );
      console.log('✅ Self-declaration recorded');
      console.log(`📍 Client declared state: CA`);
      console.log(`🔗 Redirect to: ${declaredResult.originalUrl}\n`);
    } catch (error) {
      console.log(`❌ Self-declaration failed: ${error}\n`);
    }

    // 6. Show current metrics
    console.log('📈 Step 6: Current system metrics');
    const metrics = await metricsService.getMetrics();
    
    console.log(`📊 Metrics Summary:`);
    console.log(`   • P95 Latency: ${metrics.redirectLatencyP95.toFixed(1)}ms`);
    console.log(`   • Fail-open rate: ${metrics.failOpenRate.toFixed(1)}%`);
    console.log(`   • Geo success rate: ${metrics.geoVerificationSuccessRate.toFixed(1)}%`);
    console.log(`   • Total requests: ${metrics.totalRequests}`);
    console.log(`   • Uptime: ${Math.round(metrics.uptime / 1000)}s\n`);

    // 7. Check for alerts
    const alerts = await metricsService.getAlerts();
    if (alerts.length > 0) {
      console.log('🚨 Active alerts:');
      alerts.forEach(alert => {
        console.log(`   ${alert.level.toUpperCase()}: ${alert.message}`);
      });
    } else {
      console.log('✅ No active alerts - system healthy');
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('• ⚡ Ultra-fast token generation and resolution');
    console.log('• 🌍 Multi-provider geo-location with confidence scoring');
    console.log('• 📊 Real-time SLA monitoring and alerting');
    console.log('• 🔄 Graceful fail-open behavior');
    console.log('• 💬 Client self-declaration support');
    console.log('• 🎯 <200ms performance requirement compliance');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
if (require.main === module) {
  demoWrapperService().catch(console.error);
}

export { demoWrapperService };