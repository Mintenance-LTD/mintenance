'use client';

import React, { useState } from 'react';
import { logger } from '@mintenance/shared';
import { Icon } from '@/components/ui/Icon';

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddPaymentMethod?: (data: PaymentFormData) => void;
}

interface PaymentFormData {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    phoneNumber: string;
    location: string;
}

export function PaymentMethodModal({ isOpen, onClose, onAddPaymentMethod }: PaymentMethodModalProps) {
    const [formData, setFormData] = useState<PaymentFormData>({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        phoneNumber: '',
        location: 'United States',
    });

    const [errors, setErrors] = useState<Partial<PaymentFormData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (field: keyof PaymentFormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        let value = e.target.value;

        // Format card number with spaces
        if (field === 'cardNumber') {
            value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            if (value.length > 19) return; // 16 digits + 3 spaces
        }

        // Format expiry date
        if (field === 'expiryDate') {
            value = value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            if (value.length > 5) return;
        }

        // Format CVV
        if (field === 'cvv') {
            value = value.replace(/\D/g, '');
            if (value.length > 3) return;
        }

        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<PaymentFormData> = {};

        if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
            newErrors.cardNumber = 'Valid card number required';
        }
        if (!formData.expiryDate || formData.expiryDate.length !== 5) {
            newErrors.expiryDate = 'Valid expiry date required (MM/YY)';
        }
        if (!formData.cvv || formData.cvv.length !== 3) {
            newErrors.cvv = 'Valid CVV required';
        }
        if (!formData.cardholderName.trim()) {
            newErrors.cardholderName = 'Cardholder name required';
        }
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // Call the onAddPaymentMethod callback if provided
            if (onAddPaymentMethod) {
                await onAddPaymentMethod(formData);
            }

            // Reset form and close
            setFormData({
                cardNumber: '',
                expiryDate: '',
                cvv: '',
                cardholderName: '',
                phoneNumber: '',
                location: 'United States',
            });
            onClose();
        } catch (error) {
            logger.error('Error adding payment method:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Add Payment Method</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close"
                    >
                        <Icon name="x" size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Card Number */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Card Number
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.cardNumber}
                                onChange={handleChange('cardNumber')}
                                placeholder="1234 5678 9012 3456"
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.cardNumber ? 'border-red-500' : 'border-gray-200'
                                    }`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Icon name="creditCard" size={20} className="text-gray-400" />
                            </div>
                        </div>
                        {errors.cardNumber && (
                            <p className="mt-1 text-sm text-red-500">{errors.cardNumber}</p>
                        )}
                    </div>

                    {/* Expiry Date & CVV */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Expiry Date
                            </label>
                            <input
                                type="text"
                                value={formData.expiryDate}
                                onChange={handleChange('expiryDate')}
                                placeholder="MM/YY"
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.expiryDate ? 'border-red-500' : 'border-gray-200'
                                    }`}
                            />
                            {errors.expiryDate && (
                                <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                CVV
                            </label>
                            <input
                                type="text"
                                value={formData.cvv}
                                onChange={handleChange('cvv')}
                                placeholder="123"
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.cvv ? 'border-red-500' : 'border-gray-200'
                                    }`}
                            />
                            {errors.cvv && (
                                <p className="mt-1 text-sm text-red-500">{errors.cvv}</p>
                            )}
                        </div>
                    </div>

                    {/* Cardholder Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cardholder Name
                        </label>
                        <input
                            type="text"
                            value={formData.cardholderName}
                            onChange={handleChange('cardholderName')}
                            placeholder="John Doe"
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.cardholderName ? 'border-red-500' : 'border-gray-200'
                                }`}
                        />
                        {errors.cardholderName && (
                            <p className="mt-1 text-sm text-red-500">{errors.cardholderName}</p>
                        )}
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={handleChange('phoneNumber')}
                            placeholder="+1 (555) 123-4567"
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.phoneNumber ? 'border-red-500' : 'border-gray-200'
                                }`}
                        />
                        {errors.phoneNumber && (
                            <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
                        )}
                    </div>

                    {/* Location/Currency */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Location
                        </label>
                        <select
                            value={formData.location}
                            onChange={handleChange('location')}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                            <option value="Germany">Germany</option>
                            <option value="France">France</option>
                        </select>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full px-6 py-3.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Payment Method'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
