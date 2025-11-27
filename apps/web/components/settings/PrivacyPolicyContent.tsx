import React from 'react';
import { theme } from '@/lib/theme';

export function PrivacyPolicyContent() {
  return (
    <div style={{ 
      fontSize: theme.typography.fontSize.base,
      lineHeight: 1.6,
      color: theme.colors.textPrimary,
    }}>
      <p style={{ 
        marginBottom: theme.spacing[4],
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
      }}>
        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <section style={{ marginBottom: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          1. Introduction
        </h3>
        <p style={{ marginBottom: theme.spacing[3], color: theme.colors.textSecondary }}>
          Welcome to Mintenance Ltd ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
        </p>
        <p style={{ color: theme.colors.textSecondary }}>
          By using Mintenance, you agree to the collection and use of information in accordance with this policy.
        </p>
      </section>

      <section style={{ 
        marginBottom: theme.spacing[6],
        padding: theme.spacing[4],
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
      }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[2],
          color: theme.colors.textPrimary,
        }}>
          Company Details
        </h3>
        <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing[1] }}>
          <strong>MINTENANCE LTD</strong>
        </p>
        <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing[1] }}>
          Registered Office: Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY
        </p>
        <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing[1] }}>
          Company Number: 16542104
        </p>
        <p style={{ color: theme.colors.textSecondary }}>
          Registered in England and Wales
        </p>
      </section>

      <section style={{ marginBottom: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          2. Information We Collect
        </h3>
        <p style={{ marginBottom: theme.spacing[2], color: theme.colors.textSecondary }}>
          We collect personal information that you provide to us, including:
        </p>
        <ul style={{ 
          paddingLeft: theme.spacing[6],
          marginBottom: theme.spacing[3],
          color: theme.colors.textSecondary,
        }}>
          <li style={{ marginBottom: theme.spacing[1] }}>Name and contact details</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Account credentials</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Profile information</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Location data</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Payment information (processed securely)</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Job details and project information</li>
        </ul>
      </section>

      <section style={{ marginBottom: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          3. Your Rights Under UK GDPR
        </h3>
        <p style={{ marginBottom: theme.spacing[2], color: theme.colors.textSecondary }}>
          You have the right to:
        </p>
        <ul style={{ 
          paddingLeft: theme.spacing[6],
          marginBottom: theme.spacing[3],
          color: theme.colors.textSecondary,
        }}>
          <li style={{ marginBottom: theme.spacing[1] }}>Access your personal data</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Rectify inaccurate data</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Request deletion of your data</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Object to processing</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Data portability</li>
        </ul>
        <p style={{ color: theme.colors.textSecondary }}>
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@mintenance.app" style={{ color: theme.colors.primary }}>
            privacy@mintenance.app
          </a>
        </p>
      </section>

      <section style={{ 
        marginTop: theme.spacing[6],
        padding: theme.spacing[4],
        backgroundColor: '#10B98115',
        borderRadius: theme.borderRadius.lg,
        borderLeft: `4px solid #10B981`,
      }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[2],
          color: theme.colors.textPrimary,
        }}>
          Contact Us
        </h3>
        <p style={{ marginBottom: theme.spacing[2], color: theme.colors.textSecondary }}>
          <strong>Email:</strong> privacy@mintenance.app
        </p>
        <p style={{ color: theme.colors.textSecondary }}>
          <strong>Post:</strong> Data Protection Officer, Mintenance Ltd, Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY
        </p>
      </section>
    </div>
  );
}

