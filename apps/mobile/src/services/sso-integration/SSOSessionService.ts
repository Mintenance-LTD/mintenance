/**
 * SSOSessionService
 * 
 * Handles SSO session management, including creation, validation, and termination.
 */

import { supabase } from '../../config/supabase';
import { SSOSession } from './types';

export class SSOSessionService {
  /**
   * Create a new SSO session
   */
  async createSession(
    userId: string,
    providerId?: string,
    sessionType: 'web' | 'mobile' | 'api' | 'sso' = 'sso',
    metadata?: any
  ): Promise<SSOSession> {
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data, error } = await supabase
      .from('sso_sessions')
      .insert({
        user_id: userId,
        provider_id: providerId,
        session_token: sessionToken,
        session_type: sessionType,
        expires_at: expiresAt.toISOString(),
        last_activity_at: new Date().toISOString(),
        is_active: true,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get active SSO sessions
   */
  async getActiveSessions(userId?: string): Promise<SSOSession[]> {
    let query = supabase
      .from('sso_sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query.order('last_activity_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string): Promise<SSOSession | null> {
    const { data, error } = await supabase
      .from('sso_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) return null;

    // Update last activity
    await this.updateLastActivity(data.id);

    return data;
  }

  /**
   * Update session last activity
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(userId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Terminate expired sessions
   */
  async terminateExpiredSessions(): Promise<number> {
    const { data, error } = await supabase
      .from('sso_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, additionalHours: number = 24): Promise<void> {
    const currentSession = await this.getSessionById(sessionId);
    if (!currentSession) throw new Error('Session not found');

    const newExpiresAt = new Date(Date.now() + additionalHours * 60 * 60 * 1000);

    const { error } = await supabase
      .from('sso_sessions')
      .update({
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<SSOSession | null> {
    const { data, error } = await supabase
      .from('sso_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(userId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    by_type: Record<string, number>;
  }> {
    let query = supabase
      .from('sso_sessions')
      .select('session_type, is_active, expires_at');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    const now = new Date();
    const stats = {
      total: sessions?.length || 0,
      active: sessions?.filter(s => s.is_active && new Date(s.expires_at) > now).length || 0,
      expired: sessions?.filter(s => !s.is_active || new Date(s.expires_at) <= now).length || 0,
      by_type: {} as Record<string, number>,
    };

    sessions?.forEach(session => {
      stats.by_type[session.session_type] = (stats.by_type[session.session_type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clean up provider sessions
   */
  async cleanupProviderSessions(providerId: string): Promise<void> {
    const { error } = await supabase
      .from('sso_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', providerId);

    if (error) throw error;
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
