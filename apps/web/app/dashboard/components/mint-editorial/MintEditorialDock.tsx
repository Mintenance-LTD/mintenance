'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Camera, Mic, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface JobDraft {
  title: string;
  category: string;
  urgency: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
}

/**
 * Mint AI compose dock — Option A (natural-language job draft).
 *
 * The homeowner types a problem in plain English; we POST to
 * /api/ai/job-draft, get back a structured draft (title, category,
 * urgency, optional budget range), and forward them as query params
 * to /jobs/create where the wizard reads them off the URL.
 *
 * V1 classifier is deterministic keywords on the server — no LLM
 * round-trip needed. The contract is stable so we can swap in a
 * model call later without touching this component.
 *
 * The camera + mic buttons are deliberately not wired yet. Camera
 * is the planned hook for the building-surveyor photo flow; mic
 * for Web Speech transcription. Calling them out as TODOs would
 * be noise — they don't fail closed, they no-op until the next
 * pass adds them.
 */
export function MintEditorialDock() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const description = value.trim();
    if (description.length < 3 || pending) return;

    setPending(true);
    try {
      const res = await fetch('/api/ai/job-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || 'Could not draft a job from that.');
      }
      const { draft } = (await res.json()) as { draft: JobDraft };
      const params = new URLSearchParams({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        urgency: draft.urgency,
      });
      if (draft.budgetMin != null && draft.budgetMax != null) {
        params.set('budget_min', String(draft.budgetMin));
        params.set('budget_max', String(draft.budgetMax));
      }
      router.push(`/jobs/create?${params.toString()}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(message);
      setPending(false);
    }
  };

  return (
    <form className='mint-dock' onSubmit={submit}>
      <span className='spark' aria-hidden='true'>
        <Sparkles size={15} strokeWidth={1.75} />
      </span>
      <input
        type='text'
        className='mint-dock-input'
        placeholder='Ask Mint, or describe a new problem… e.g. "boiler keeps cutting out"'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        aria-label='Describe a new problem'
        maxLength={2000}
      />
      <div className='actions'>
        <button
          type='button'
          className='icon-btn'
          aria-label='Camera (coming soon)'
          disabled
          title='Photo guidance — coming soon'
        >
          <Camera size={15} strokeWidth={1.75} />
        </button>
        <button
          type='button'
          className='icon-btn'
          aria-label='Mic (coming soon)'
          disabled
          title='Voice transcription — coming soon'
        >
          <Mic size={15} strokeWidth={1.75} />
        </button>
        <button
          type='submit'
          className='send'
          aria-label='Draft a job'
          disabled={pending || value.trim().length < 3}
        >
          {pending ? (
            <Loader2
              size={14}
              strokeWidth={2}
              style={{ animation: 'spin 0.9s linear infinite' }}
            />
          ) : (
            <Send size={14} strokeWidth={2} />
          )}
        </button>
      </div>
    </form>
  );
}
