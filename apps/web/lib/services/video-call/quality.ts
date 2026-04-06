import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { CallQualityMetrics } from '@mintenance/types';

/**
 * Compute quality metrics from a RTCPeerConnection stats report
 */
export async function computeAndRecordQuality(
  peerConnection: RTCPeerConnection,
  callId: string,
  userId: string
): Promise<void> {
  try {
    const stats = await peerConnection.getStats();
    let audioQuality: CallQualityMetrics['audioQuality'] = 'good';
    let videoQuality: CallQualityMetrics['videoQuality'] = 'good';
    let latency = 0;
    let packetsLost = 0;

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        packetsLost += report.packetsLost ?? 0;
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
      }
    });

    // Simple quality assessment
    if (packetsLost > 50) videoQuality = 'poor';
    else if (packetsLost > 20) videoQuality = 'fair';

    if (latency > 300) audioQuality = 'poor';
    else if (latency > 150) audioQuality = 'fair';

    await supabase
      .from('call_quality_metrics')
      .insert([{
        call_id: callId,
        user_id: userId,
        audio_quality: audioQuality,
        video_quality: videoQuality,
        connection_stability: 'stable',
        latency_ms: latency,
        packets_lost: packetsLost,
        bandwidth: 1000, // Mock bandwidth
        timestamp: new Date().toISOString()
      }]);
  } catch (error) {
    logger.error('Quality tracking error', error);
  }
}

/**
 * Fetch latest call quality metrics for a call
 */
export async function fetchCallQuality(callId: string): Promise<CallQualityMetrics | null> {
  try {
    const { data, error } = await supabase
      .from('call_quality_metrics')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      logger.error('Error fetching call quality', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Get call quality error', error);
    return null;
  }
}
