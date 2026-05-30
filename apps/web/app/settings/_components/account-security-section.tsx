import { useState, type Dispatch, type SetStateAction } from 'react';
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
  // 2026-05-27 audit-P2-8: gate the client-side bypass on
  // NODE_ENV !== 'production' to match the server-side P0.1 fix
  // (CLAUDE.md). Without this prod guard, a leaked
  // NEXT_PUBLIC_SKIP_PHONE_VERIFICATION=true in a prod build would
  // hide the phone-verification UI even though the API still
  // enforces — leaving users locked out with no actionable prompt.
  const skipPhone =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION === 'true';

  // 2026-05-27 audit-75 P2: typed-DELETE confirmation before the
  // irreversible button enables. The shared DeleteAccountModal and
  // the mobile DeleteAccountScreen both require typing "DELETE";
  // this section previously had a plain confirm-button-2 which was
  // far easier to misfire. Same wording as the shared modal for
  // consistency across surfaces.
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState('');
  const isDeleteConfirmed = deleteTypeConfirm.trim().toUpperCase() === 'DELETE';

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
              Are you absolutely sure? Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type='text'
              value={deleteTypeConfirm}
              onChange={(e) => setDeleteTypeConfirm(e.target.value)}
              placeholder='DELETE'
              autoComplete='off'
              aria-label='Type DELETE to confirm account deletion'
              className='field-input'
              style={{
                padding: '8px 12px',
                border: '1px solid var(--me-line)',
                borderRadius: 8,
                fontSize: 14,
                maxWidth: 240,
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={async () => {
                  if (!isDeleteConfirmed) return;
                  await onDeleteAccount();
                  // Reset on the chance the parent reopens this state
                  // after a blocked deletion (409 keeps the modal open
                  // so the user can read the toasts and act).
                  setDeleteTypeConfirm('');
                }}
                disabled={!isDeleteConfirmed}
                className='btn'
                style={{
                  background: isDeleteConfirmed
                    ? 'var(--me-err-fg)'
                    : 'var(--me-ink-3)',
                  color: 'var(--me-on-brand)',
                  opacity: isDeleteConfirmed ? 1 : 0.6,
                  cursor: isDeleteConfirmed ? 'pointer' : 'not-allowed',
                }}
              >
                Yes, delete forever
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTypeConfirm('');
                }}
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
