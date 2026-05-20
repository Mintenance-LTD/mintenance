import type { Dispatch, SetStateAction } from 'react';
import { Shield } from 'lucide-react';
import type { PasswordData } from './types';

interface AccountSecurityUser {
  email: string;
  phone?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
}

interface AccountSecuritySectionProps {
  user: AccountSecurityUser;
  passwordData: PasswordData;
  setPasswordData: Dispatch<SetStateAction<PasswordData>>;
  twoFactorEnabled: boolean;
  setTwoFactorEnabled: (enabled: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  isSaving: boolean;
  csrfToken: string | null;
  onChangePassword: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onSendVerificationCode: () => Promise<void>;
  onAddPhoneNumber: () => void;
  onUpdatePhoneNumber: () => void;
}

/**
 * Account & Security settings section — Direction A · Mint Editorial.
 * Renders on the `--me-*` tokens + `.card` / `.field` / `.btn` /
 * `.badge` primitives.
 */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--me-ink-2)',
  marginBottom: 6,
};

export function AccountSecuritySection({
  user,
  passwordData,
  setPasswordData,
  twoFactorEnabled,
  showDeleteConfirm,
  setShowDeleteConfirm,
  isSaving,
  csrfToken,
  onChangePassword,
  onDeleteAccount,
  onSendVerificationCode,
  onAddPhoneNumber,
  onUpdatePhoneNumber,
}: AccountSecuritySectionProps) {
  const skipPhone = process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION === 'true';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className='t-h1' style={{ marginBottom: 4 }}>
          Account &amp; Security
        </h1>
        <p className='t-body' style={{ margin: 0 }}>
          Manage your account security settings
        </p>
      </div>

      {/* Email Verification Card */}
      <div className='card' style={{ padding: 28 }}>
        <h2 className='t-h3' style={{ marginBottom: 16 }}>
          Email
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                color: 'var(--me-ink)',
                fontSize: 14,
              }}
            >
              {user.email}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 13,
                color: 'var(--me-ink-3)',
              }}
            >
              Your primary email address
            </p>
          </div>
          {user.email_verified && (
            <span className='badge badge-ok'>Verified</span>
          )}
        </div>
      </div>

      {/* Phone Verification Card */}
      <div className='card' style={{ padding: 28 }}>
        <h2 className='t-h3' style={{ marginBottom: 16 }}>
          Phone verification
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  color: 'var(--me-ink)',
                  fontSize: 14,
                }}
              >
                {user.phone || 'No phone number added'}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 13,
                  color: 'var(--me-ink-3)',
                }}
              >
                {user.phone_verified
                  ? 'Your phone number is verified'
                  : skipPhone
                    ? 'Phone verification is currently not required'
                    : 'Phone verification is required to post jobs'}
              </p>
            </div>
            {user.phone_verified ? (
              <span className='badge badge-ok'>Verified</span>
            ) : skipPhone ? (
              <span className='badge badge-info'>Skipped</span>
            ) : (
              <span className='badge badge-warn'>Not verified</span>
            )}
          </div>

          {!user.phone_verified && !skipPhone && (
            <div
              style={{
                background: 'var(--me-warn-bg)',
                borderRadius: 'var(--me-radius-input)',
                padding: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <Shield
                className='w-5 h-5'
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  color: 'var(--me-warn-fg)',
                }}
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--me-warn-fg)',
                  }}
                >
                  Verification required
                </p>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: 13,
                    color: 'var(--me-warn-fg)',
                  }}
                >
                  To post jobs and hire contractors, you need to verify your
                  phone number for security purposes.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            {!user.phone_verified &&
              !skipPhone &&
              (!user.phone ? (
                <button onClick={onAddPhoneNumber} className='btn btn-primary'>
                  Add phone number
                </button>
              ) : (
                <button
                  onClick={onSendVerificationCode}
                  disabled={isSaving || !csrfToken}
                  className='btn btn-primary'
                  style={{ opacity: isSaving || !csrfToken ? 0.6 : 1 }}
                >
                  {isSaving ? 'Sending code…' : 'Verify phone number'}
                </button>
              ))}
            {user.phone_verified && user.phone && (
              <button onClick={onUpdatePhoneNumber} className='btn btn-ghost'>
                Update phone number
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className='card' style={{ padding: 28 }}>
        <h2 className='t-h3' style={{ marginBottom: 16 }}>
          Change password
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor='acct-currentPassword' style={labelStyle}>
              Current password
            </label>
            <input
              id='acct-currentPassword'
              type='password'
              className='field'
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label htmlFor='acct-newPassword' style={labelStyle}>
              New password
            </label>
            <input
              id='acct-newPassword'
              type='password'
              className='field'
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label htmlFor='acct-confirmPassword' style={labelStyle}>
              Confirm new password
            </label>
            <input
              id='acct-confirmPassword'
              type='password'
              className='field'
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
            />
          </div>
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              onClick={onChangePassword}
              disabled={isSaving}
              className='btn btn-primary'
              style={{ opacity: isSaving ? 0.6 : 1 }}
            >
              {isSaving ? 'Updating…' : 'Update password'}
            </button>
            <button
              onClick={() =>
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                })
              }
              className='btn btn-ghost'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className='card' style={{ padding: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <h2 className='t-h3' style={{ marginBottom: 4 }}>
              Two-factor authentication
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--me-ink-3)',
              }}
            >
              Add an extra layer of security to your account
            </p>
          </div>
          <a href='/settings/security/mfa' className='btn btn-secondary'>
            {twoFactorEnabled ? 'Manage MFA' : 'Set up MFA'}
          </a>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div
        className='card'
        style={{ padding: 28, borderColor: 'var(--me-err-bg)' }}
      >
        <h2
          className='t-h3'
          style={{ marginBottom: 4, color: 'var(--me-err-fg)' }}
        >
          Danger zone
        </h2>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 13,
            color: 'var(--me-ink-2)',
          }}
        >
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className='btn'
            style={{
              background: 'var(--me-err-fg)',
              color: 'var(--me-on-brand)',
            }}
          >
            Delete account
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--me-err-fg)',
              }}
            >
              Are you absolutely sure?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onDeleteAccount}
                className='btn'
                style={{
                  background: 'var(--me-err-fg)',
                  color: 'var(--me-on-brand)',
                }}
              >
                Yes, delete forever
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className='btn btn-secondary'
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
