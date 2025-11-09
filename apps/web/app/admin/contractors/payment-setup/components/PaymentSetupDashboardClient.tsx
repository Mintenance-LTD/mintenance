'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface Contractor {
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  pendingEscrows: number;
  totalPendingAmount: number;
  oldestEscrowDate: string;
}

interface Props {
  contractors: Contractor[];
}

export function PaymentSetupDashboardClient({ contractors }: Props) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const sendReminder = async (contractorId: string) => {
    setSending(contractorId);
    try {
      const response = await fetch('/api/admin/contractors/send-payment-setup-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      setSent((prev) => new Set(prev).add(contractorId));
    } catch (error) {
      alert('Failed to send reminder');
    } finally {
      setSending(null);
    }
  };

  if (contractors.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">All contractors have completed payment setup.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending Escrows
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Oldest Escrow
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contractors.map((contractor) => (
              <tr key={contractor.contractorId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {contractor.contractorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contractor.contractorEmail}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contractor.pendingEscrows}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  £{contractor.totalPendingAmount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(contractor.oldestEscrowDate), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sent.has(contractor.contractorId) ? (
                    <span className="text-green-600">Reminder sent</span>
                  ) : (
                    <button
                      onClick={() => sendReminder(contractor.contractorId)}
                      disabled={sending === contractor.contractorId}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending === contractor.contractorId ? 'Sending...' : 'Send Reminder'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

