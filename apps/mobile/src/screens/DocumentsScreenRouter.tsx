import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DocumentsScreen from './contractor/DocumentsScreen';
import HomeownerDocumentsScreen from './homeowner/HomeownerDocumentsScreen';

/**
 * Picks the right Documents screen based on the signed-in user's role.
 * Homeowners see contracts + bids + payments via /api/documents.
 * Contractors see uploaded documents + contracts + certifications via direct supabase queries.
 */
export const DocumentsScreenRouter: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'homeowner') {
    return <HomeownerDocumentsScreen />;
  }
  return <DocumentsScreen />;
};

export default DocumentsScreenRouter;
