'use client';

import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';

export function GDPRSettings() {
    const [isExporting, setIsExporting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            // TODO: Implement actual export functionality
            const response = await fetch('/api/user/export-data', {
                method: 'POST',
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'my-data.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteAccount = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {
        try {
            // TODO: Implement actual delete functionality
            const response = await fetch('/api/user/delete-account', {
                method: 'DELETE',
            });

            if (response.ok) {
                // Redirect to goodbye page or login
                window.location.href = '/login?deleted=true';
            }
        } catch (error) {
            console.error('Error deleting account:', error);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">GDPR Rights</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                    GDPR stands for General Data Protection Regulation, which gives you certain rights over how your data is used.
                    We take your privacy seriously and are committed to protecting your personal information.
                    Below are some of the key rights provided to you under GDPR law, including being able to access, edit and delete your data.
                </p>
            </div>

            {/* Export Data Section */}
            <div>
                <h3 className="text-base font-medium text-gray-900 mb-4">Export My Data</h3>
                <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="
            inline-flex items-center gap-2 
            px-6 py-3 
            bg-white 
            border-2 border-gray-300 
            rounded-lg 
            text-gray-700 font-medium
            hover:bg-gray-50 
            hover:border-gray-400
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
                >
                    <Download className="w-5 h-5" />
                    {isExporting ? 'Exporting...' : 'Export My Data'}
                </button>
            </div>

            {/* Delete Account Section */}
            <div className="border-t border-gray-200 pt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-900">
                                This action cannot be reversed, this account will get deleted.
                            </p>
                        </div>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <button
                        onClick={handleDeleteAccount}
                        className="
              w-full
              px-6 py-3 
              bg-red-600 
              text-white font-semibold
              rounded-lg 
              hover:bg-red-700 
              transition-colors
            "
                    >
                        Delete My Account
                    </button>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-700 font-medium">
                            Are you absolutely sure you want to delete your account? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmDeleteAccount}
                                className="
                  flex-1
                  px-6 py-3 
                  bg-red-600 
                  text-white font-semibold
                  rounded-lg 
                  hover:bg-red-700 
                  transition-colors
                "
                            >
                                Yes, Delete My Account
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="
                  flex-1
                  px-6 py-3 
                  bg-white 
                  border-2 border-gray-300 
                  text-gray-700 font-medium
                  rounded-lg 
                  hover:bg-gray-50 
                  transition-colors
                "
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
