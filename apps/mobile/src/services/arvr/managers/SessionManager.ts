/**
 * AR/VR Session Manager
 *
 * Handles session lifecycle, performance monitoring, and interactions
 */

import { logger } from '../../../utils/logger';
import { performanceMonitor } from '../../../utils/performanceMonitor';
import type { ARVRSession, ARVRInteraction, ARVRPerformanceMetrics } from '../types/SessionTypes';

export class SessionManager {
  private activeSessions: Map<string, ARVRSession> = new Map();
  private sessionHistory: ARVRSession[] = [];
  private performanceInterval?: NodeJS.Timeout;

  /**
   * Start AR/VR session
   */
  async startSession(
    type: 'ar' | 'vr' | 'mixed',
    jobId: string,
    userId: string
  ): Promise<ARVRSession> {
    const session: ARVRSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      jobId,
      userId,
      status: 'starting',
      startTime: Date.now(),
      duration: 0,
      interactions: [],
      performance: this.initializePerformanceMetrics(),
      metadata: {}
    };

    this.activeSessions.set(session.id, session);

    // Start performance monitoring
    this.startPerformanceMonitoring(session.id);

    // Update session status to active
    session.status = 'active';

    logger.info('SessionManager', 'AR/VR session started', {
      sessionId: session.id,
      type,
      jobId,
      userId
    });

    return session;
  }

  /**
   * End AR/VR session
   */
  async endSession(sessionId: string): Promise<ARVRSession | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('SessionManager', 'Session not found for ending', { sessionId });
      return null;
    }

    // Stop performance monitoring
    this.stopPerformanceMonitoring();

    // Update session
    session.status = 'ended';
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Move to history
    this.sessionHistory.push(session);
    this.activeSessions.delete(sessionId);

    // Keep only last 50 sessions in history
    if (this.sessionHistory.length > 50) {
      this.sessionHistory = this.sessionHistory.slice(-50);
    }

    logger.info('SessionManager', 'AR/VR session ended', {
      sessionId,
      duration: session.duration,
      interactionCount: session.interactions.length
    });

    return session;
  }

  /**
   * Pause session
   */
  pauseSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return false;
    }

    session.status = 'paused';
    this.stopPerformanceMonitoring();

    logger.info('SessionManager', 'AR/VR session paused', { sessionId });
    return true;
  }

  /**
   * Resume session
   */
  resumeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'paused') {
      return false;
    }

    session.status = 'active';
    this.startPerformanceMonitoring(sessionId);

    logger.info('SessionManager', 'AR/VR session resumed', { sessionId });
    return true;
  }

  /**
   * Record interaction
   */
  recordInteraction(
    sessionId: string,
    type: 'tap' | 'pinch' | 'pan' | 'rotate' | 'voice' | 'gesture',
    target: string,
    data: Record<string, any> = {}
  ): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    const interaction: ARVRInteraction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      target,
      timestamp: Date.now(),
      data
    };

    session.interactions.push(interaction);

    logger.debug('SessionManager', 'Interaction recorded', {
      sessionId,
      interactionType: type,
      target
    });

    return true;
  }

  /**
   * Get active session
   */
  getActiveSession(sessionId: string): ARVRSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ARVRSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session history
   */
  getSessionHistory(): ARVRSession[] {
    return [...this.sessionHistory];
  }

  /**
   * Get user session history
   */
  getUserSessionHistory(userId: string): ARVRSession[] {
    return this.sessionHistory.filter(session => session.userId === userId);
  }

  /**
   * Get job session history
   */
  getJobSessionHistory(jobId: string): ARVRSession[] {
    return this.sessionHistory.filter(session => session.jobId === jobId);
  }

  /**
   * Start performance monitoring for session
   */
  private startPerformanceMonitoring(sessionId: string): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }

    this.performanceInterval = setInterval(() => {
      const session = this.activeSessions.get(sessionId);
      if (session && session.status === 'active') {
        this.updatePerformanceMetrics(session);
      }
    }, 1000); // Update every second
  }

  /**
   * Stop performance monitoring
   */
  private stopPerformanceMonitoring(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = undefined;
    }
  }

  /**
   * Update performance metrics for session
   */
  private updatePerformanceMetrics(session: ARVRSession): void {
    try {
      // Get current performance data
      const metrics = performanceMonitor.getCurrentMetrics();

      // Update session performance
      session.performance = {
        fps: metrics.fps || 60,
        frameDrops: metrics.frameDrops || 0,
        renderTime: metrics.renderTime || 16.67,
        memoryUsage: metrics.memoryUsage || 0,
        batteryDrain: this.calculateBatteryDrain(),
        thermalState: this.getThermalState(),
        trackingQuality: this.getTrackingQuality(session.type)
      };

      // Log performance issues
      if (session.performance.fps < 30) {
        logger.warn('SessionManager', 'Low FPS detected', {
          sessionId: session.id,
          fps: session.performance.fps
        });
      }

      if (session.performance.thermalState === 'critical') {
        logger.error('SessionManager', 'Critical thermal state', {
          sessionId: session.id,
          thermalState: session.performance.thermalState
        });
      }

    } catch (error) {
      logger.error('SessionManager', 'Failed to update performance metrics', error);
    }
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): ARVRPerformanceMetrics {
    return {
      fps: 60,
      frameDrops: 0,
      renderTime: 16.67,
      memoryUsage: 0,
      batteryDrain: 0,
      thermalState: 'nominal',
      trackingQuality: 'normal'
    };
  }

  /**
   * Calculate battery drain rate
   */
  private calculateBatteryDrain(): number {
    // Simplified battery drain calculation
    // In a real implementation, this would use actual battery APIs
    return Math.random() * 5; // 0-5% per hour
  }

  /**
   * Get thermal state
   */
  private getThermalState(): 'nominal' | 'fair' | 'serious' | 'critical' {
    // Simplified thermal state
    // In a real implementation, this would use actual thermal APIs
    const states: Array<'nominal' | 'fair' | 'serious' | 'critical'> = ['nominal', 'fair', 'serious', 'critical'];
    return states[Math.floor(Math.random() * states.length)];
  }

  /**
   * Get tracking quality based on session type
   */
  private getTrackingQuality(sessionType: 'ar' | 'vr' | 'mixed'): 'poor' | 'limited' | 'normal' | 'excellent' {
    // Simplified tracking quality assessment
    // In a real implementation, this would use actual tracking APIs
    const qualities: Array<'poor' | 'limited' | 'normal' | 'excellent'> = ['poor', 'limited', 'normal', 'excellent'];
    return qualities[Math.floor(Math.random() * qualities.length)];
  }

  /**
   * Cleanup expired sessions
   */
  cleanup(): void {
    const now = Date.now();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

    // End any sessions that have been active too long
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > maxSessionAge) {
        logger.warn('SessionManager', 'Force ending long-running session', {
          sessionId,
          duration: now - session.startTime
        });
        this.endSession(sessionId);
      }
    }

    // Clean up old history
    const maxHistoryAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.sessionHistory = this.sessionHistory.filter(
      session => now - (session.endTime || session.startTime) < maxHistoryAge
    );
  }
}