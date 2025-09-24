/**
 * Network Diagnostics Utility
 *
 * Helps diagnose network connectivity issues in the mobile app
 */

import { Platform } from 'react-native';
import { testSupabaseConnection } from '../config/supabase';
import { logger } from './logger';

interface NetworkDiagnostics {
  platform: string;
  timestamp: string;
  connectivity: {
    supabase: { success: boolean; error?: string; latency?: number };
    internet: { success: boolean; error?: string; latency?: number };
  };
  environment: {
    userAgent: string;
    reactNativeVersion: string;
    expoVersion?: string;
  };
  recommendations: string[];
}

export class NetworkDiagnosticsService {
  /**
   * Run comprehensive network diagnostics
   */
  static async runDiagnostics(): Promise<NetworkDiagnostics> {
    logger.info('🔍 Running network diagnostics...');

    const timestamp = new Date().toISOString();
    const platform = Platform.OS;

    // Test general internet connectivity
    const internetTest = await this.testInternetConnectivity();

    // Test Supabase connectivity
    const supabaseTest = await testSupabaseConnection();

    // Generate recommendations
    const recommendations = this.generateRecommendations(internetTest, supabaseTest);

    const diagnostics: NetworkDiagnostics = {
      platform,
      timestamp,
      connectivity: {
        internet: internetTest,
        supabase: supabaseTest,
      },
      environment: {
        userAgent: this.getUserAgent(),
        reactNativeVersion: this.getReactNativeVersion(),
        expoVersion: this.getExpoVersion(),
      },
      recommendations,
    };

    logger.info('✅ Network diagnostics completed', diagnostics);
    return diagnostics;
  }

  /**
   * Test basic internet connectivity
   */
  private static async testInternetConnectivity(): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      const startTime = Date.now();
      logger.info('🌐 Testing internet connectivity...');

      // Use a reliable external service for connectivity test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (response.ok) {
        logger.info(`✅ Internet connectivity test successful (${latency}ms)`);
        return { success: true, latency };
      } else {
        logger.warn(`⚠️ Internet connectivity test failed: HTTP ${response.status}`);
        return { success: false, error: `HTTP ${response.status}`, latency };
      }
    } catch (error: any) {
      logger.error('❌ Internet connectivity test error:', error);
      return {
        success: false,
        error: error.message || 'Network request failed'
      };
    }
  }

  /**
   * Generate troubleshooting recommendations
   */
  private static generateRecommendations(
    internetTest: { success: boolean; error?: string },
    supabaseTest: { success: boolean; error?: string }
  ): string[] {
    const recommendations: string[] = [];

    // Internet connectivity issues
    if (!internetTest.success) {
      recommendations.push('Check your WiFi or mobile data connection');
      recommendations.push('Try switching between WiFi and mobile data');
      recommendations.push('Restart your network connection');

      if (internetTest.error?.includes('timeout')) {
        recommendations.push('Your internet connection may be slow - try again in a few moments');
      }
    }

    // Supabase-specific issues
    if (!supabaseTest.success) {
      recommendations.push('Supabase backend service may be experiencing issues');

      if (supabaseTest.error?.includes('Network request failed')) {
        recommendations.push('This appears to be a network connectivity issue');
        recommendations.push('Try closing and reopening the app');
      }

      if (supabaseTest.error?.includes('timeout')) {
        recommendations.push('The server is taking too long to respond - try again later');
      }
    }

    // Platform-specific recommendations
    if (Platform.OS === 'android') {
      recommendations.push('Android: Ensure app has network permissions');
      recommendations.push('Android: Check if background data is allowed');
    } else if (Platform.OS === 'ios') {
      recommendations.push('iOS: Check app permissions in Settings');
      recommendations.push('iOS: Ensure cellular data is enabled for this app');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('All network tests passed - the issue may be temporary');
      recommendations.push('Try logging in again');
    } else {
      recommendations.push('Contact support if the issue persists');
    }

    return recommendations;
  }

  /**
   * Get user agent string
   */
  private static getUserAgent(): string {
    try {
      return `Mintenance/${this.getAppVersion()} (${Platform.OS} ${Platform.Version})`;
    } catch {
      return 'Mintenance/1.1.1 (unknown)';
    }
  }

  /**
   * Get React Native version
   */
  private static getReactNativeVersion(): string {
    try {
      return Platform.constants?.reactNativeVersion
        ? `${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}.${Platform.constants.reactNativeVersion.patch}`
        : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get Expo version
   */
  private static getExpoVersion(): string {
    try {
      // This will be available in Expo managed workflow
      return (global as any).__expo?.version || 'not-expo';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get app version
   */
  private static getAppVersion(): string {
    return '1.1.1'; // This could be imported from app.config.js or package.json
  }

  /**
   * Format diagnostics for display
   */
  static formatDiagnosticsForDisplay(diagnostics: NetworkDiagnostics): string {
    const lines: string[] = [];

    lines.push('🔍 Network Diagnostics Report');
    lines.push(`📅 ${new Date(diagnostics.timestamp).toLocaleString()}`);
    lines.push(`📱 Platform: ${diagnostics.platform}`);
    lines.push('');

    lines.push('🌐 Connectivity Tests:');
    lines.push(`   Internet: ${diagnostics.connectivity.internet.success ? '✅' : '❌'} ${diagnostics.connectivity.internet.latency ? `(${diagnostics.connectivity.internet.latency}ms)` : ''}`);
    lines.push(`   Supabase: ${diagnostics.connectivity.supabase.success ? '✅' : '❌'} ${diagnostics.connectivity.supabase.latency ? `(${diagnostics.connectivity.supabase.latency}ms)` : ''}`);

    if (!diagnostics.connectivity.internet.success || !diagnostics.connectivity.supabase.success) {
      lines.push('');
      lines.push('🔧 Recommendations:');
      diagnostics.recommendations.forEach(rec => {
        lines.push(`   • ${rec}`);
      });
    }

    return lines.join('\n');
  }
}

export default NetworkDiagnosticsService;