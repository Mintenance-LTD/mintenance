'use client';

import { Phone, Mail, MessageCircle } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface ContractorContactModalProps {
  contractorName: string;
  phone: string;
  email: string;
  onClose: () => void;
  onSendMessage: () => void;
}

export function ContractorContactModal({
  contractorName,
  phone,
  email,
  onClose,
  onSendMessage,
}: ContractorContactModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">Contact {contractorName}</h3>

        <div className="space-y-4 mb-6">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Phone className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{phone}</p>
              </div>
            </a>
          )}

          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>
            </a>
          )}

          {!phone && !email && (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">Contact information not available</p>
            </div>
          )}

          <button
            onClick={onSendMessage}
            className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-teal-600" />
            <div className="text-left">
              <p className="text-sm text-gray-600">Message</p>
              <p className="font-medium text-gray-900">Send a message</p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </MotionDiv>
    </div>
  );
}
