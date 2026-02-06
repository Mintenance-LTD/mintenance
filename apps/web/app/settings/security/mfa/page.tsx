'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import Image from 'next/image';

interface MFAStatus {
  enabled: boolean;
  method: string | null;
  enrolledAt: string | null;
  phoneNumber: string | null;
  backupCodesCount: number;
  trustedDevicesCount: number;
}

interface EnrollmentData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export default function MFASettingsPage() {
  const router = useRouter();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState('');

  // Enrollment state
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  // Disable state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  // Backup codes state
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Fetch CSRF token
  useEffect(() => {
    async function fetchCSRF() {
      try {
        const response = await fetch('/api/csrf');
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        logger.error('Failed to fetch CSRF token', error);
      }
    }
    fetchCSRF();
  }, []);

  // Fetch MFA status
  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status');
      const data = await response.json();

      if (response.ok) {
        setMfaStatus(data.data);
      } else {
        toast.error('Failed to load MFA status');
      }
    } catch (error) {
      logger.error('Failed to fetch MFA status', error);
      toast.error('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEnrollment = async () => {
    setEnrolling(true);

    try {
      const response = await fetch('/api/auth/mfa/enroll/totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start enrollment');
      }

      setEnrollmentData(data.data);
      setShowBackupCodes(true);
      toast.success('Scan the QR code with your authenticator app');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start enrollment';
      toast.error(message);
      logger.error('MFA enrollment error', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setEnrolling(true);

    try {
      const response = await fetch('/api/auth/mfa/verify-enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast.success('MFA enabled successfully!');
      setEnrollmentData(null);
      setVerificationCode('');
      setShowBackupCodes(false);
      fetchMFAStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      toast.error(message);
      logger.error('MFA verification error', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!disablePassword) {
      toast.error('Password is required');
      return;
    }

    setDisabling(true);

    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable MFA');
      }

      toast.success('MFA disabled successfully');
      setShowDisableModal(false);
      setDisablePassword('');
      fetchMFAStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disable MFA';
      toast.error(message);
      logger.error('MFA disable error', error);
    } finally {
      setDisabling(false);
    }
  };

  const handleCopyBackupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Backup code copied!');
  };

  const handlePrintBackupCodes = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Two-Factor Authentication</h1>
        <p className="mt-2 text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Current status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              MFA Status
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {mfaStatus?.enabled ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Enabled
                  </span>
                  <span className="ml-2">
                    Using {mfaStatus.method?.toUpperCase()}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Disabled
                </span>
              )}
            </p>
          </div>
          {mfaStatus?.enabled ? (
            <Button
              variant="outline"
              onClick={() => setShowDisableModal(true)}
            >
              Disable MFA
            </Button>
          ) : (
            <Button
              onClick={handleStartEnrollment}
              disabled={enrolling || !!enrollmentData}
            >
              {enrolling ? 'Setting up...' : 'Enable MFA'}
            </Button>
          )}
        </div>

        {mfaStatus?.enabled && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Backup codes remaining:</span>
              <span className="font-medium text-gray-900">
                {mfaStatus.backupCodesCount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Trusted devices:</span>
              <span className="font-medium text-gray-900">
                {mfaStatus.trustedDevicesCount}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Enrollment flow */}
      {enrollmentData && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Set Up Authenticator App
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Scan the QR code with your authenticator app
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <Image
                src={enrollmentData.qrCode}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
          </div>

          {/* Manual entry */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Can't scan? Enter this code manually:
            </p>
            <code className="px-3 py-2 bg-gray-100 rounded font-mono text-sm">
              {enrollmentData.secret}
            </code>
          </div>

          {/* Verification */}
          <div>
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
              Enter verification code from app
            </label>
            <div className="flex gap-2">
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-xl tracking-widest font-mono flex-1"
                disabled={enrolling}
              />
              <Button
                onClick={handleVerifyEnrollment}
                disabled={enrolling || verificationCode.length !== 6}
              >
                {enrolling ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </div>

          {/* Backup codes - show initially, hide after acknowledged */}
          {showBackupCodes && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Save Your Backup Codes
                </h3>
                <p className="text-sm text-yellow-700">
                  Save these backup codes in a secure location. You can use each code once
                  if you lose access to your authenticator app.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {enrollmentData.backupCodes.map((code, index) => (
                  <button
                    key={index}
                    onClick={() => handleCopyBackupCode(code)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded font-mono text-sm text-left transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrintBackupCodes}
                  className="flex-1"
                >
                  Print Codes
                </Button>
                <Button
                  onClick={() => setShowBackupCodes(false)}
                  className="flex-1"
                >
                  I've Saved My Codes
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Disable MFA modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => {
          setShowDisableModal(false);
          setDisablePassword('');
        }}
        title="Disable Two-Factor Authentication"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Disabling MFA will make your account less secure. Enter your password to confirm.
          </p>

          <div>
            <label htmlFor="disablePassword" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              id="disablePassword"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Enter your password"
              disabled={disabling}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableModal(false);
                setDisablePassword('');
              }}
              disabled={disabling}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisableMFA}
              disabled={disabling || !disablePassword}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {disabling ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
