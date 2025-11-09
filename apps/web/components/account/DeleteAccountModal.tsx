'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

/**
 * DeleteAccountModal Component
 * 
 * Confirmation modal for account deletion with safety checks.
 * Requires user to type "DELETE" to confirm.
 */
export function DeleteAccountModal({ isOpen, onClose, userId }: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmationText !== 'DELETE') {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          confirmation: confirmationText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear any auth cookies/tokens
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Redirect to login page
      router.push('/login?message=Account deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !loading) {
      setConfirmationText('');
      setError(null);
      onClose();
    }
  };

  const isConfirmed = confirmationText === 'DELETE';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Delete Account</DialogTitle>
              <DialogDescription className="mt-1">This action cannot be undone</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Warning Message */}
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Deleting your account will permanently remove your profile and all associated data. 
            This includes:
            <ul className="mt-2 ml-5 list-disc space-y-1">
              <li>Your profile information</li>
              <li>Job postings and bids</li>
              <li>Messages and conversations</li>
              <li>Payment and transaction history</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <Label htmlFor="confirmation">
            Type <strong>DELETE</strong> to confirm:
          </Label>
          <Input
            id="confirmation"
            type="text"
            value={confirmationText}
            onChange={(e) => {
              setConfirmationText(e.target.value);
              setError(null);
            }}
            placeholder="DELETE"
            disabled={loading}
            errorText={error || undefined}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

