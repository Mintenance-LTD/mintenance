import { z } from 'zod';

const draftSchema = z.object({
  title: z.string().max(160),
  inspectedOn: z.string().max(10),
  kind: z.enum(['check_in', 'routine', 'check_out']),
  notes: z.string().max(10000),
  reason: z.string().max(1000),
  photoIds: z.array(z.string()).max(50),
  noIssues: z.boolean(),
});

export type InspectionDraft = z.infer<typeof draftSchema>;

export function inspectionDraftKey(
  accountId: string | undefined,
  propertyId: string,
  folderId: string,
  correctsReportId?: string
) {
  return accountId
    ? 'mintenance:inspection-draft:v1:' +
        JSON.stringify([
          accountId,
          propertyId,
          folderId,
          correctsReportId ?? null,
        ])
    : null;
}

export function readInspectionDraft(
  key: string | null
): InspectionDraft | null {
  if (!key) return null;
  try {
    return (
      draftSchema.safeParse(
        JSON.parse(window.sessionStorage.getItem(key) ?? 'null')
      ).data ?? null
    );
  } catch {
    return null;
  }
}

// Store selected photo IDs only. Unuploaded files never go into browser storage.
export function writeInspectionDraft(
  key: string,
  draft: string | null
): boolean {
  try {
    if (draft === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, draft);
    return true;
  } catch {
    return false;
  }
}

export function clearSavedInspectionDraft(key: string, submittedDraft: string) {
  try {
    if (window.sessionStorage.getItem(key) === submittedDraft)
      window.sessionStorage.removeItem(key);
  } catch {
    // The report was saved even if the browser no longer allows draft storage.
  }
}
