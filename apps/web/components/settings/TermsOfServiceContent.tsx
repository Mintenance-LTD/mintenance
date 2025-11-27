import React from 'react';
import { theme } from '@/lib/theme';

export function TermsOfServiceContent() {
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
          1. Agreement to Terms
        </h3>
        <p style={{ marginBottom: theme.spacing[3], color: theme.colors.textSecondary }}>
          Welcome to Mintenance. These Terms of Service ("Terms") govern your use of the Mintenance platform, including our website and mobile application. By accessing or using Mintenance, you agree to be bound by these Terms and our Privacy Policy.
        </p>
        <p style={{ color: theme.colors.textSecondary }}>
          If you do not agree to these Terms, you may not use our services.
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
          2. User Accounts
        </h3>
        <p style={{ marginBottom: theme.spacing[2], color: theme.colors.textSecondary }}>
          You are responsible for:
        </p>
        <ul style={{ 
          paddingLeft: theme.spacing[6],
          marginBottom: theme.spacing[3],
          color: theme.colors.textSecondary,
        }}>
          <li style={{ marginBottom: theme.spacing[1] }}>Maintaining the confidentiality of your account</li>
          <li style={{ marginBottom: theme.spacing[1] }}>All activities under your account</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Providing accurate and current information</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Notifying us of any unauthorized access</li>
        </ul>
      </section>

      <section style={{ marginBottom: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          3. Service Usage
        </h3>
        <p style={{ marginBottom: theme.spacing[2], color: theme.colors.textSecondary }}>
          You agree to:
        </p>
        <ul style={{ 
          paddingLeft: theme.spacing[6],
          marginBottom: theme.spacing[3],
          color: theme.colors.textSecondary,
        }}>
          <li style={{ marginBottom: theme.spacing[1] }}>Use the platform in accordance with applicable laws</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Not engage in fraudulent or harmful activities</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Respect other users' rights and privacy</li>
          <li style={{ marginBottom: theme.spacing[1] }}>Not interfere with platform operations</li>
        </ul>
      </section>

      <section style={{ marginBottom: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          4. Payments and Fees
        </h3>
        <p style={{ color: theme.colors.textSecondary }}>
          All payments are processed securely through our payment partners. Fees are clearly displayed before any transaction. Refunds are subject to our refund policy and applicable consumer protection laws.
        </p>
      </section>

      <section style={{ marginBottom: theme.spacing[6] }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          5. Limitation of Liability
        </h3>
        <p style={{ color: theme.colors.textSecondary }}>
          Mintenance provides the platform "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
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
          For questions about these Terms, contact us at{' '}
          <a href="mailto:legal@mintenance.app" style={{ color: theme.colors.primary }}>
            legal@mintenance.app
          </a>
        </p>
        <p style={{ color: theme.colors.textSecondary }}>
          <strong>Post:</strong> Mintenance Ltd, Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY
        </p>
      </section>
    </div>
  );
}

