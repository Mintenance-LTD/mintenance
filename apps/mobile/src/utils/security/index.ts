/**
 * Security Module - Main Export
 *
 * Provides consolidated access to security audit and penetration testing functionality
 */

// Create and export singleton instance
import { SecurityAuditService } from './core/SecurityAuditService';

export const securityAuditService = new SecurityAuditService();
export default securityAuditService;
