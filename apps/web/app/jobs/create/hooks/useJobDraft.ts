'use client';
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { z } from 'zod';
import { initialFormDataFromParams } from '../utils/url-prefill';
import type { JobFormData } from '../utils/validation';
const draftSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.string(),
  category: z.string(),
  requiredSkills: z.array(z.string()),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
  property_id: z.string().optional(),
  is_rental_property: z.boolean().optional(),
  who_pays: z.enum(['me', 'someone_else']).optional(),
  payer_email: z.string().optional(),
  room_ids: z.array(z.string()).optional(),
});
/** Session-only, account-scoped recovery. Files must be reselected after reload. */
export function useJobDraft(
  userId: string | undefined,
  context: string,
  form: JobFormData,
  setForm: Dispatch<SetStateAction<JobFormData>>,
  sourceForm?: JobFormData
) {
  const key = userId ? `mintenance-job-draft:${userId}:${context}` : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  const request = useRef<string | null>(null);
  const submitted = useRef(false);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!key || loaded === key) return;
    submitted.current = false;
    request.current = null;
    setRestored(false);
    let restoredForm =
      sourceForm ?? initialFormDataFromParams(new URLSearchParams(context));
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      const parsed = draftSchema.safeParse(saved?.form);
      if (parsed.success) {
        restoredForm = sourceForm
          ? {
              ...parsed.data,
              property_id: sourceForm.property_id,
              location: sourceForm.location,
              is_rental_property: true,
            }
          : parsed.data;
        setRestored(true);
        if (z.uuid().safeParse(saved.requestId).success)
          request.current = saved.requestId;
      }
    } catch {
      /* Storage may be disabled; the mounted draft still survives retries. */
    }
    setForm(restoredForm);
    setLoaded(key);
  }, [key, loaded, context, setForm, sourceForm]);
  useEffect(() => {
    if (!key || loaded !== key || submitted.current) return;
    const timer = setTimeout(() => {
      if (submitted.current) return;
      request.current ||= crypto.randomUUID();
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({ form, requestId: request.current })
        );
      } catch {
        /* Keep the in-memory draft. */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [key, loaded, form]);
  return {
    ready: !!key && loaded === key,
    restored,
    submissionId: () => {
      request.current ||= crypto.randomUUID();
      if (key)
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({ form, requestId: request.current })
          );
        } catch {
          /* Keep the same in-memory request ID. */
        }
      return request.current;
    },
    complete: () => {
      submitted.current = true;
      if (key)
        try {
          sessionStorage.removeItem(key);
        } catch {
          /* No storage available. */
        }
    },
  };
}
