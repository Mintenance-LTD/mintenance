import { Alert, Linking } from 'react-native';
import type { Document } from './types';

/**
 * Routes a document tap to either:
 *   - Job/Contract detail screen (for contracts)
 *   - The file's public URL (for uploaded documents + cert PDFs)
 *   - An "unable to open" alert when no URL is attached.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d).
 */
export function openDocument(args: {
  doc: Document;
  navigateToJob: (jobId: string) => void;
}): void {
  const { doc, navigateToJob } = args;

  if (
    doc.is_contract ||
    doc.category === 'contract' ||
    doc.category === 'contracts'
  ) {
    navigateToJob(doc.job_id ?? doc.id);
    return;
  }

  if (doc.public_url) {
    Linking.openURL(doc.public_url).catch(() => {
      Alert.alert(
        'Cannot Open',
        'Unable to open this file. The URL may be unavailable.'
      );
    });
    return;
  }

  Alert.alert(
    'No File',
    'This document does not have a viewable file attached.'
  );
}
