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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold mb-4">Enter Verification Code</h3>
        <p className="text-gray-600 mb-6">
          We&apos;ve sent a 6-digit verification code to {verificationPhoneNumber}
        </p>

        <div className="mb-6">
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
            }}
            placeholder="000000"
            className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            maxLength={6}
            autoFocus
          />
          <p className="text-sm text-gray-500 mt-2 text-center">
            {verificationCode.length}/6 digits
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onVerify}
            disabled={verificationCode.length !== 6 || isSaving}
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Verifying...' : 'Verify'}
          </button>

          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <button
          onClick={onResend}
          disabled={isSaving}
          className="w-full mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium disabled:opacity-50"
        >
          Didn&apos;t receive the code? Resend
        </button>
      </div>
    </div>
  );
}
