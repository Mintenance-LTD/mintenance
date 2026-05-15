interface PhoneVerificationDialogProps {
  isOpen: boolean;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  verificationPhoneNumber: string;
  isSaving: boolean;
  onVerify: () => Promise<void>;
  onCancel: () => void;
  onResend: () => Promise<void>;
}

/**
 * Phone verification modal — Direction A · Mint Editorial. Token-styled
 * overlay + card; the verification logic is unchanged.
 */
export function PhoneVerificationDialog({
  isOpen,
  verificationCode,
  setVerificationCode,
  verificationPhoneNumber,
  isSaving,
  onVerify,
  onCancel,
  onResend,
}: PhoneVerificationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Phone verification'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(26,37,32,0.55)',
      }}
    >
      <div
        className='card'
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 28,
          boxShadow: 'var(--me-shadow-pop)',
        }}
      >
        <h3 className='t-h3' style={{ marginBottom: 6 }}>
          Enter verification code
        </h3>
        <p
          className='t-body'
          style={{ margin: '0 0 20px', color: 'var(--me-ink-2)' }}
        >
          We&apos;ve sent a 6-digit verification code to{' '}
          <strong style={{ color: 'var(--me-ink)' }}>
            {verificationPhoneNumber}
          </strong>
        </p>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor='phone-verification-code' className='sr-only'>
            Verification code
          </label>
          <input
            id='phone-verification-code'
            type='text'
            inputMode='numeric'
            className='field'
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
            }}
            placeholder='000000'
            maxLength={6}
            autoFocus
            style={{
              textAlign: 'center',
              fontSize: 24,
              letterSpacing: '0.3em',
              fontFamily: 'var(--me-font-ui)',
            }}
          />
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 12,
              textAlign: 'center',
              color: 'var(--me-ink-3)',
            }}
          >
            {verificationCode.length}/6 digits
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onVerify}
            disabled={verificationCode.length !== 6 || isSaving}
            className='btn btn-primary'
            style={{
              flex: 1,
              justifyContent: 'center',
              opacity: verificationCode.length !== 6 || isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Verifying…' : 'Verify'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className='btn btn-secondary'
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Cancel
          </button>
        </div>

        <button
          onClick={onResend}
          disabled={isSaving}
          style={{
            width: '100%',
            marginTop: 16,
            background: 'transparent',
            border: 0,
            color: 'var(--me-brand)',
            fontSize: 13,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          Didn&apos;t receive the code? Resend
        </button>
      </div>
    </div>
  );
}
